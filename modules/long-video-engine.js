"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { Pool } = require("pg");

const MAX_DURATION_MINUTES = 120;
const DEFAULT_SCENE_SECONDS = 10;
const MAX_TITLE = 120;
const MAX_STORY = 12000;
const DATABASE_URL = String(process.env.ULUGBEK_DATABASE_URL || "").trim();
const TABLE = "ulugbek_video_studio_projects";

function cleanText(value, max, label) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) { const error = new Error(label + " kiritilishi shart."); error.status = 400; throw error; }
  if (text.length > max) { const error = new Error(label + " juda uzun."); error.status = 413; throw error; }
  return text;
}
function makeScenePrompt({ story, genre, language, sceneNumber, sceneCount, durationSeconds, visualStyle }) {
  return [
    "Film janri: " + genre,
    "Dialog tili: " + language,
    "Vizual uslub: " + visualStyle,
    "Hikoya: " + story,
    "Sahna " + sceneNumber + "/" + sceneCount + ".",
    "Ushbu sahnani oldingi va keyingi sahnalar bilan mantiqan uzluksiz, bir xil qahramonlar va joylar bilan davom ettir.",
    "Sahna davomiyligi: taxminan " + durationSeconds + " soniya."
  ].join("\n");
}
function buildScenePlan(input) {
  const durationMinutes = Number(input.durationMinutes);
  if (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > MAX_DURATION_MINUTES) {
    const error = new Error("Film davomiyligi 1–120 daqiqa oralig‘ida bo‘lishi kerak."); error.status = 400; throw error;
  }
  const story = cleanText(input.story, MAX_STORY, "Film g‘oyasi");
  const title = cleanText(input.title || "Yangi film loyihasi", MAX_TITLE, "Film nomi");
  const genre = typeof input.genre === "string" ? input.genre.trim().slice(0, 60) || "Drama" : "Drama";
  const language = typeof input.language === "string" ? input.language.trim().slice(0, 30) || "O‘zbek" : "O‘zbek";
  const visualStyle = typeof input.visualStyle === "string" ? input.visualStyle.trim().slice(0, 100) || "Kinematografik realizm" : "Kinematografik realizm";
  const totalSeconds = Math.round(durationMinutes * 60);
  const sceneCount = Math.ceil(totalSeconds / DEFAULT_SCENE_SECONDS);
  const scenes = Array.from({ length: sceneCount }, (_, index) => {
    const duration = Math.min(DEFAULT_SCENE_SECONDS, totalSeconds - index * DEFAULT_SCENE_SECONDS);
    return {
      id: "SCENE-" + String(index + 1).padStart(4, "0"),
      number: index + 1,
      durationSeconds: duration,
      startSeconds: index * DEFAULT_SCENE_SECONDS,
      endSeconds: index * DEFAULT_SCENE_SECONDS + duration,
      status: "planned",
      prompt: makeScenePrompt({ story, genre, language, sceneNumber: index + 1, sceneCount, durationSeconds: duration, visualStyle }),
      output: null,
      qualityScore: null,
      error: null
    };
  });
  return { title, story, genre, language, visualStyle, durationMinutes, durationSeconds: totalSeconds, sceneSeconds: DEFAULT_SCENE_SECONDS, scenes };
}
function createLongVideoEngine({
  dataDir = process.env.ULUGBEK_DATA_DIR || path.join(process.cwd(), "data"),
  databaseUrl = DATABASE_URL,
  pool: injectedPool = null
} = {}) {
  const root = path.resolve(dataDir);
  const file = path.join(root, "video-studio-projects.json");
  let cache = null;
  let pool = injectedPool;
  let databaseReady = false;
  let databaseError = null;

  function getPool() {
    if (!databaseUrl) return null;
    if (!pool) {
      pool = new Pool({
        connectionString: databaseUrl,
        max: 2,
        connectionTimeoutMillis: 7000,
        idleTimeoutMillis: 10000,
        keepAlive: true
      });
      pool.on("error", error => { databaseError = String(error.message || error).slice(0, 180); });
    }
    return pool;
  }
  async function ensureDatabase() {
    if (!databaseUrl) return false;
    if (databaseReady) return true;
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS ${TABLE} (
        id TEXT PRIMARY KEY,
        project JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
    await getPool().query(`CREATE INDEX IF NOT EXISTS ulugbek_video_studio_updated_idx ON ${TABLE} (updated_at DESC)`);
    databaseReady = true;
    databaseError = null;
    return true;
  }
  async function migrateLegacyFileIfEmpty() {
    const count = await getPool().query(`SELECT COUNT(*)::int AS count FROM ${TABLE}`);
    if (Number(count.rows[0]?.count || 0) > 0) return 0;
    let legacy = [];
    try {
      const parsed = JSON.parse(await fs.readFile(file, "utf8"));
      if (Array.isArray(parsed)) legacy = parsed.filter(item => item && typeof item.id === "string" && Array.isArray(item.scenes));
    } catch (error) {
      if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
    }
    if (!legacy.length) return 0;
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      for (const project of legacy) {
        await client.query(
          `INSERT INTO ${TABLE} (id, project, created_at, updated_at) VALUES ($1, $2::jsonb, $3, $4) ON CONFLICT (id) DO NOTHING`,
          [project.id, JSON.stringify(project), project.createdAt || new Date().toISOString(), project.updatedAt || project.createdAt || new Date().toISOString()]
        );
      }
      await client.query("COMMIT");
      return legacy.length;
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch (_) {}
      throw error;
    } finally { client.release(); }
  }
  async function loadFile() {
    if (cache) return cache;
    await fs.mkdir(root, { recursive: true });
    try {
      const parsed = JSON.parse(await fs.readFile(file, "utf8"));
      cache = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      cache = [];
    }
    return cache;
  }
  async function saveFile(projects) {
    await fs.mkdir(root, { recursive: true });
    const temp = file + "." + crypto.randomUUID() + ".tmp";
    await fs.writeFile(temp, JSON.stringify(projects, null, 2), { mode: 0o600 });
    await fs.rename(temp, file);
    cache = projects;
  }
  async function loadDatabaseProjects() {
    await ensureDatabase();
    await migrateLegacyFileIfEmpty();
    const result = await getPool().query(`SELECT project FROM ${TABLE} ORDER BY updated_at DESC LIMIT 100`);
    return result.rows.map(row => typeof row.project === "string" ? JSON.parse(row.project) : row.project);
  }
  function summarize(project) {
    const scenes = project.scenes || [];
    const ready = scenes.filter(scene => scene.status === "completed").length;
    const failed = scenes.filter(scene => scene.status === "failed").length;
    const active = scenes.filter(scene => scene.status === "generating").length;
    return {
      id: project.id, title: project.title, status: project.status,
      durationMinutes: project.durationMinutes, totalScenes: scenes.length,
      completedScenes: ready, failedScenes: failed, activeScenes: active,
      progressPercent: scenes.length ? Math.round(ready / scenes.length * 100) : 0,
      createdAt: project.createdAt, updatedAt: project.updatedAt,
      generationConfigured: false,
      notice: "Ssenariy va sahna rejasi tayyorlanadi. Haqiqiy video generatsiyasi uchun alohida GPU/ComfyUI workflow ulanishi kerak."
    };
  }
  return {
    async create(input) {
      const plan = buildScenePlan(input || {});
      const now = new Date().toISOString();
      const project = { id: crypto.randomUUID(), ...plan, status: "planned", createdAt: now, updatedAt: now, generation: { provider: null, configured: false }, export: { status: "not-started", format: "mp4", resolution: "1080p" } };
      if (databaseUrl) {
        await ensureDatabase();
        await getPool().query(
          `INSERT INTO ${TABLE} (id, project, created_at, updated_at) VALUES ($1, $2::jsonb, $3, $4)`,
          [project.id, JSON.stringify(project), now, now]
        );
      } else {
        const projects = await loadFile();
        await saveFile([project, ...projects].slice(0, 100));
      }
      return { ...project, summary: summarize(project) };
    },
    async list() {
      const projects = databaseUrl ? await loadDatabaseProjects() : await loadFile();
      return projects.map(summarize);
    },
    async get(id) {
      let project;
      if (databaseUrl) {
        await ensureDatabase();
        const result = await getPool().query(`SELECT project FROM ${TABLE} WHERE id = $1`, [id]);
        project = result.rows[0]?.project;
        if (typeof project === "string") project = JSON.parse(project);
      } else {
        project = (await loadFile()).find(item => item.id === id);
      }
      if (!project) { const error = new Error("Film loyihasi topilmadi."); error.status = 404; throw error; }
      return { ...project, summary: summarize(project) };
    },
    async updateScene(id, sceneId, patch = {}) {
      if (databaseUrl) {
        await ensureDatabase();
        const client = await getPool().connect();
        try {
          await client.query("BEGIN");
          const found = await client.query(`SELECT project FROM ${TABLE} WHERE id = $1 FOR UPDATE`, [id]);
          let project = found.rows[0]?.project;
          if (typeof project === "string") project = JSON.parse(project);
          if (!project) { const error = new Error("Film loyihasi topilmadi."); error.status = 404; throw error; }
          const updated = applyScenePatch(project, sceneId, patch);
          await client.query(`UPDATE ${TABLE} SET project = $2::jsonb, updated_at = $3 WHERE id = $1`, [id, JSON.stringify(updated), updated.updatedAt]);
          await client.query("COMMIT");
          return { ...updated, summary: summarize(updated) };
        } catch (error) {
          try { await client.query("ROLLBACK"); } catch (_) {}
          throw error;
        } finally { client.release(); }
      }
      const projects = await loadFile();
      const project = projects.find(item => item.id === id);
      if (!project) { const error = new Error("Film loyihasi topilmadi."); error.status = 404; throw error; }
      applyScenePatch(project, sceneId, patch);
      await saveFile(projects);
      return { ...project, summary: summarize(project) };
    },
    status() {
      return {
        ready: true,
        persistence: databaseUrl ? "neon-postgresql" : "json-atomic",
        databaseConfigured: Boolean(databaseUrl),
        databaseReady,
        databaseError,
        maxDurationMinutes: MAX_DURATION_MINUTES,
        defaultSceneSeconds: DEFAULT_SCENE_SECONDS,
        automaticVideoGeneration: false,
        requiresGpuWorker: true
      };
    }
  };
}
function applyScenePatch(project, sceneId, patch = {}) {
  const scene = project.scenes.find(item => item.id === sceneId);
  if (!scene) { const error = new Error("Film sahnasi topilmadi."); error.status = 404; throw error; }
  if (patch.status && !["planned", "generating", "completed", "failed"].includes(patch.status)) {
    const error = new Error("Sahna holati noto‘g‘ri."); error.status = 400; throw error;
  }
  if (patch.status) scene.status = patch.status;
  if (patch.error !== undefined) scene.error = String(patch.error).slice(0, 500);
  if (patch.qualityScore !== undefined) {
    const score = Number(patch.qualityScore);
    if (!Number.isFinite(score) || score < 0 || score > 100) { const error = new Error("Sifat bahosi 0–100 oralig‘ida bo‘lishi kerak."); error.status = 400; throw error; }
    scene.qualityScore = score;
  }
  project.status = project.scenes.every(item => item.status === "completed") ? "completed" : project.scenes.some(item => item.status === "generating") ? "generating" : project.scenes.some(item => item.status === "failed") ? "attention-required" : "planned";
  project.updatedAt = new Date().toISOString();
  return project;
}
module.exports = { createLongVideoEngine, buildScenePlan, makeScenePrompt, MAX_DURATION_MINUTES, DEFAULT_SCENE_SECONDS, applyScenePatch };
