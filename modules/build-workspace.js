"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const registry = require("../agents/registry");
const localModel = require("./local-model");

const ROOT = path.resolve(process.env.BUILD_WORKSPACE_DIR || path.join(__dirname, "..", "data", "build-workspaces"));
const ALLOWED_EXTENSIONS = new Set([".html", ".css", ".js", ".json", ".md", ".txt", ".py"]);
const MAX_FILES = 10;
const MAX_FILE_BYTES = 20000;
const MAX_TOTAL_BYTES = 100000;

function validateGoal(goal) {
  if (typeof goal !== "string" || !goal.trim()) {
    const error = new Error("Loyiha vazifasi bo‘sh bo‘lmasligi kerak.");
    error.status = 400;
    throw error;
  }
  if (goal.length > 4000) {
    const error = new Error("Loyiha vazifasi 4000 belgidan oshmasligi kerak.");
    error.status = 413;
    throw error;
  }
  return goal.trim();
}

function validateRelativePath(value) {
  if (typeof value !== "string" || !value || value.length > 160 || value.includes("\\") || value.startsWith("/")) return false;
  const parts = value.split("/");
  if (parts.some(part => !part || part === "." || part === ".." || !/^[a-zA-Z0-9._-]+$/.test(part))) return false;
  const ext = path.extname(value).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext) && !parts.some(part => part.startsWith(".") || part.toLowerCase() === "node_modules" || part.toLowerCase() === ".git");
}

function parseGeneratedProject(raw) {
  const text = String(raw || "").trim().replace(/^\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}$/i, "");
  let parsed;
  try { parsed = JSON.parse(text); }
  catch (_) { throw new Error("Builder agent JSON loyiha fayllarini to‘g‘ri qaytarmadi. Qayta urinib ko‘ring."); }
  if (!parsed || !Array.isArray(parsed.files) || parsed.files.length < 1 || parsed.files.length > MAX_FILES) {
    throw new Error("Loyiha 1 dan 10 tagacha fayldan iborat bo‘lishi kerak.");
  }
  const seen = new Set();
  let total = 0;
  const files = parsed.files.map(file => {
    if (!file || !validateRelativePath(file.path) || seen.has(file.path) || typeof file.content !== "string") {
      throw new Error("Builder agent xavfsiz bo‘lmagan yoki takroriy fayl yo‘lini qaytardi.");
    }
    seen.add(file.path);
    const size = Buffer.byteLength(file.content, "utf8");
    if (size > MAX_FILE_BYTES) throw new Error("Loyiha fayllaridan biri 20 KB limitdan oshdi.");
    total += size;
    return { path: file.path, content: file.content, bytes: size };
  });
  if (total > MAX_TOTAL_BYTES) throw new Error("Loyiha umumiy hajmi 100 KB limitdan oshdi.");
  return {
    title: typeof parsed.title === "string" ? parsed.title.slice(0, 120) : "ULUGBEK AI loyihasi",
    summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 1000) : "",
    files
  };
}

async function createBuild(input = {}) {
  const goal = validateGoal(input.goal);
  const model = await localModel.status();
  if (!model.available) {
    const error = new Error("Loyiha yaratish uchun serverda Ollama va qwen2.5:3b modeli o‘rnatilgan bo‘lishi kerak. Docker Compose orqali ishga tushiring.");
    error.status = 503;
    throw error;
  }
  const builder = registry.getAgent("software-builder-agent");
  const raw = await localModel.generate([
    {
      role: "system",
      content: builder.systemPrompt +
        "\nSen ULUGBEK AI ichidagi xavfsiz loyiha quruvchisan. Faqat JSON qaytar: {\"title\":string,\"summary\":string,\"files\":[{\"path\":string,\"content\":string}]}. 1-10 ta kichik, o‘zaro mos fayl yarat. Faqat html, css, js, json, md, txt yoki py fayllari. Fayllarni ishga tushirma, tashqi xizmatga ulanma, sir/parol/token qo‘shma, package install/deploy buyruqlarini bermagin. Fayl yo‘llari nisbiy bo‘lsin. Ishlab chiqarish kodini o‘zgartirmagin."
    },
    { role: "user", content: "Quyidagi talab bo‘yicha ko‘rib chiqish uchun loyiha fayllarini yarat: " + goal }
  ], { modelOptions: { num_predict: 5000 } });
  const project = parseGeneratedProject(raw);
  const id = crypto.randomUUID();
  const directory = path.join(ROOT, id);
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  for (const file of project.files) {
    const target = path.resolve(directory, file.path);
    if (!target.startsWith(directory + path.sep)) throw new Error("Fayl yo‘li ish maydonidan tashqariga chiqdi.");
    await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    await fs.writeFile(target, file.content, { encoding: "utf8", mode: 0o600, flag: "wx" });
  }
  const manifest = {
    id, title: project.title, summary: project.summary, goal,
    status: "awaiting_human_review",
    execution: "not_executed",
    deployment: "not_deployed",
    createdAt: new Date().toISOString(),
    files: project.files.map(({ path: filePath, bytes }) => ({ path: filePath, bytes }))
  };
  await fs.writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest, null, 2), { mode: 0o600, flag: "wx" });
  return { ...manifest, files: project.files };
}

async function getBuild(id) {
  if (typeof id !== "string" || !/^[a-f0-9-]{36}$/i.test(id)) return null;
  const directory = path.join(ROOT, id);
  try {
    const manifest = JSON.parse(await fs.readFile(path.join(directory, "manifest.json"), "utf8"));
    const files = [];
    for (const item of manifest.files) {
      if (!validateRelativePath(item.path)) continue;
      const target = path.resolve(directory, item.path);
      if (!target.startsWith(directory + path.sep)) continue;
      files.push({ path: item.path, content: await fs.readFile(target, "utf8"), bytes: item.bytes });
    }
    return { ...manifest, files };
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

module.exports = { createBuild, getBuild, validateGoal, validateRelativePath, parseGeneratedProject };
