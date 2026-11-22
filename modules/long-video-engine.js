"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const MAX_DURATION_MINUTES = 120;
const DEFAULT_SCENE_SECONDS = 10;
const MAX_TITLE = 120;
const MAX_STORY = 12000;

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
  const sceneSeconds = DEFAULT_SCENE_SECONDS;
  const totalSeconds = Math.round(durationMinutes * 60);
  const sceneCount = Math.ceil(totalSeconds / sceneSeconds);
  const scenes = Array.from({ length: sceneCount }, (_, index) => {
    const duration = Math.min(sceneSeconds, totalSeconds - index * sceneSeconds);
    return {
      id: "SCENE-" + String(index + 1).padStart(4, "0"),
      number: index + 1,
      durationSeconds: duration,
      startSeconds: index * sceneSeconds,
      endSeconds: index * sceneSeconds + duration,
      status: "planned",
      prompt: makeScenePrompt({ story, genre, language, sceneNumber: index + 1, sceneCount, durationSeconds: duration, visualStyle }),
      output: null,
      qualityScore: null,
      error: null
    };
  });
  return { title, story, genre, language, visualStyle, durationMinutes, durationSeconds: totalSeconds, sceneSeconds, scenes };
}
function createLongVideoEngine({ dataDir = process.env.ULUGBEK_DATA_DIR || path.join(process.cwd(), "data") } = {}) {
  const root = path.resolve(dataDir);
  const file = path.join(root, "video-studio-projects.json");
  let cache = null;
  async function load() {
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
  async function save(projects) {
    await fs.mkdir(root, { recursive: true });
    const temp = file + "." + crypto.randomUUID() + ".tmp";
    await fs.writeFile(temp, JSON.stringify(projects, null, 2), { mode: 0o600 });
    await fs.rename(temp, file);
    cache = projects;
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
      const projects = await load();
      projects.unshift(project);
      await save(projects.slice(0, 100));
      return { ...project, summary: summarize(project) };
    },
    async list() { return (await load()).map(summarize); },
    async get(id) {
      const project = (await load()).find(item => item.id === id);
      if (!project) { const error = new Error("Film loyihasi topilmadi."); error.status = 404; throw error; }
      return { ...project, summary: summarize(project) };
    },
    async updateScene(id, sceneId, patch = {}) {
      const projects = await load();
      const project = projects.find(item => item.id === id);
      if (!project) { const error = new Error("Film loyihasi topilmadi."); error.status = 404; throw error; }
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
      await save(projects);
      return { ...project, summary: summarize(project) };
    },
    status() { return { ready: true, persistence: "json-atomic", maxDurationMinutes: MAX_DURATION_MINUTES, defaultSceneSeconds: DEFAULT_SCENE_SECONDS, automaticVideoGeneration: false, requiresGpuWorker: true }; }
  };
}
module.exports = { createLongVideoEngine, buildScenePlan, makeScenePrompt, MAX_DURATION_MINUTES, DEFAULT_SCENE_SECONDS };
