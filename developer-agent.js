"use strict";

// ULUGBEK AI single Developer Agent.
// It continuously audits the public project repository and creates reviewable proposals.
// It never writes source files, merges branches, deploys, or executes repository code.
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const OWNER = process.env.DEVELOPER_AGENT_REPO_OWNER || "Ulugbek4801741";
const REPO = process.env.DEVELOPER_AGENT_REPO_NAME || "ulugbek-ai";
const BRANCH = process.env.DEVELOPER_AGENT_BRANCH || "main";
const INTERVAL_MS = Math.max(60_000, Number(process.env.DEVELOPER_AGENT_INTERVAL_MS) || 30 * 60_000);
const STORE = path.resolve(process.env.DEVELOPER_AGENT_STORE || path.join(__dirname, "data", "developer-agent.json"));
const MAX_PROPOSALS = 300;
const MAX_FILES = 8;
const MAX_FILE_BYTES = 160_000;
const ALLOWED_EXT = /\.(?:js|cjs|mjs|json|yml|yaml|md)$/i;
let timer = null;
let running = false;
let started = false;
let chain = Promise.resolve();
let state = {
  enabled: true, running: false, startedAt: null, lastRunAt: null,
  nextRunAt: null, lastSuccessAt: null, lastError: null, cycles: 0,
  scannedFiles: 0, scanCursor: 0, proposalsCreated: 0, proposals: []
};

function clean(value, max = 500) {
  return String(value || "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
async function load() {
  try {
    const data = JSON.parse(await fs.readFile(STORE, "utf8"));
    if (data && typeof data === "object") state = { ...state, ...data, running: false };
  } catch (error) {
    if (error.code !== "ENOENT") state.lastError = "Oldingi agent xotirasi o‘qilmadi: " + clean(error.message);
  }
}
async function save() {
  const snapshot = JSON.stringify({ ...state, running: false }, null, 2);
  chain = chain.then(async () => {
    await fs.mkdir(path.dirname(STORE), { recursive: true });
    const temp = STORE + ".tmp";
    await fs.writeFile(temp, snapshot, { mode: 0o600 });
    await fs.rename(temp, STORE);
  });
  return chain;
}
async function githubJson(url, signal) {
  const response = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github+json",
      "User-Agent": "ULUGBEK-AI-Developer-Agent/1.0",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    redirect: "error",
    signal
  });
  if (!response.ok) throw new Error("GitHub API HTTP " + response.status);
  return response.json();
}
function addProposal(kind, severity, title, detail, file) {
  const key = [kind, file || "", title].join("|");
  if (state.proposals.some(item => item.key === key && item.status !== "rejected")) return false;
  state.proposals.unshift({
    id: crypto.randomUUID(), key, kind, severity, title: clean(title, 180),
    detail: clean(detail, 1200), file: clean(file, 240),
    status: "pending_admin_review", createdAt: new Date().toISOString(),
    releaseStatus: "not_released"
  });
  state.proposals = state.proposals.slice(0, MAX_PROPOSALS);
  state.proposalsCreated++;
  return true;
}
function inspectFile(file, text) {
  const findings = [];
  if (/\beval\s*\(|new Function\s*\(/.test(text)) {
    findings.push(["security", "high", "Dinamik kod bajarish konstruktsiyasi topildi", "eval yoki Function konstruktsiyasi xavfli bo‘lishi mumkin; foydalanish joyi va ishonch chegarasini tekshirish kerak.", file]);
  }
  if (/https?:\/\/api\.openai\.com|generativelanguage\.googleapis\.com|api\.anthropic\.com/.test(text)) {
    findings.push(["dependency", "medium", "Tashqi AI provayder manzili topildi", "Foydalanuvchining mustaqil AI talabi bilan mosligini tekshirish va faol chaqiruv bor-yo‘qligini aniqlash kerak.", file]);
  }
  if (/TODO|FIXME|XXX/.test(text)) {
    findings.push(["maintenance", "low", "Tugallanmagan ish belgisi topildi", "Faylda TODO/FIXME/XXX belgisi bor; vazifa va uning bajarilish holatini aniqlashtirish kerak.", file]);
  }
  if (/child_process|\bexecSync\s*\(|\bspawn\s*\(/.test(text)) {
    findings.push(["security", "medium", "Jarayon ishga tushirish kodi topildi", "Shell yoki subprocess chaqiruvlarini qat'iy argument allowlisti va izolyatsiya bilan tekshirish kerak.", file]);
  }
  return findings;
}
async function auditOnce() {
  if (running) return status();
  running = true;
  state.running = true;
  state.lastRunAt = new Date().toISOString();
  state.lastError = null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const base = "https://api.github.com/repos/" + encodeURIComponent(OWNER) + "/" + encodeURIComponent(REPO);
    const repo = await githubJson(base, controller.signal);
    const branch = await githubJson(base + "/branches/" + encodeURIComponent(BRANCH), controller.signal);
    const tree = await githubJson(base + "/git/trees/" + encodeURIComponent(branch.commit.sha) + "?recursive=1", controller.signal);
    if (!Array.isArray(tree.tree)) throw new Error("GitHub fayllar ro‘yxati noto‘g‘ri.");
    const eligible = tree.tree
      .filter(item => item.type === "blob" && ALLOWED_EXT.test(item.path) && item.size <= MAX_FILE_BYTES)
      .sort((a, b) => {
        const rank = item => /\\.(?:js|cjs|mjs)$/i.test(item.path) ? 0 : /\\.json$/i.test(item.path) ? 1 : /\\.(?:yml|yaml)$/i.test(item.path) ? 2 : 3;
        return rank(a) - rank(b) || a.path.localeCompare(b.path);
      });
    const startAt = eligible.length ? state.scanCursor % eligible.length : 0;
    const files = Array.from({ length: Math.min(MAX_FILES, eligible.length) }, (_, index) => eligible[(startAt + index) % eligible.length]);
    state.scanCursor = eligible.length ? (startAt + files.length) % eligible.length : 0;
    let scanned = 0;
    for (const item of files) {
      if (controller.signal.aborted) throw new Error("Tekshiruv vaqti tugadi.");
      if (!item.url) continue;
      const blob = await githubJson(item.url, controller.signal);
      if (blob.encoding !== "base64" || typeof blob.content !== "string") continue;
      const source = Buffer.from(blob.content.replace(/\n/g, ""), "base64").toString("utf8");
      for (const finding of inspectFile(item.path, source)) addProposal(...finding);
      scanned++;
    }
    state.scannedFiles = scanned;
    state.cycles++;
    state.lastSuccessAt = new Date().toISOString();
    state.repository = OWNER + "/" + REPO;
    state.branch = BRANCH;
    state.headCommit = branch.commit.sha;
    state.repositoryUpdatedAt = repo.updated_at || null;
  } catch (error) {
    state.lastError = clean(error.name === "AbortError" ? "GitHub tekshiruvi vaqt chegarasidan oshdi." : error.message);
  } finally {
    clearTimeout(timeout);
    running = false;
    state.running = false;
    state.nextRunAt = new Date(Date.now() + INTERVAL_MS).toISOString();
    await save();
  }
  return status();
}
function schedule() {
  if (!started) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    await auditOnce();
    schedule();
  }, INTERVAL_MS);
}
async function start() {
  if (started) return status();
  started = true;
  await load();
  state.enabled = true;
  state.startedAt = state.startedAt || new Date().toISOString();
  state.nextRunAt = new Date().toISOString();
  await auditOnce();
  schedule();
  return status();
}
function stop() {
  started = false;
  if (timer) clearTimeout(timer);
  timer = null;
  state.enabled = false;
  state.running = false;
  state.nextRunAt = null;
  save().catch(() => {});
}
function reviewProposal(id, decision, note = "") {
  const item = state.proposals.find(proposal => proposal.id === id);
  if (!item) return null;
  if (!["approved_for_release", "rejected"].includes(decision)) {
    const error = new Error("Qaror approved_for_release yoki rejected bo‘lishi kerak.");
    error.status = 400;
    throw error;
  }
  if (item.status !== "pending_admin_review") {
    const error = new Error("Faqat ko‘rib chiqilmagan taklifni belgilash mumkin.");
    error.status = 409;
    throw error;
  }
  item.status = decision;
  item.adminNote = clean(note, 500);
  item.reviewedAt = new Date().toISOString();
  item.releaseStatus = "not_released";
  save().catch(error => { state.lastError = clean(error.message); });
  return { ...item };
}
function status() {
  return {
    enabled: state.enabled, running: state.running, startedAt: state.startedAt,
    lastRunAt: state.lastRunAt, nextRunAt: state.nextRunAt,
    lastSuccessAt: state.lastSuccessAt, lastError: state.lastError,
    cycles: state.cycles, scannedFiles: state.scannedFiles,
    proposalsCreated: state.proposalsCreated,
    pendingApprovals: state.proposals.filter(item => item.status === "pending_admin_review").length,
    repository: state.repository || OWNER + "/" + REPO,
    branch: state.branch || BRANCH,
    headCommit: state.headCommit || null,
    executionMode: "read-only-repository-audit",
    codeChanges: "disabled",
    deployment: "admin-approval-required",
    uptimeGuarantee: "process-and-host-dependent"
  };
}
function listProposals() { return state.proposals.map(item => ({ ...item })); }
module.exports = { start, stop, auditOnce, status, listProposals, reviewProposal, inspectFile };
