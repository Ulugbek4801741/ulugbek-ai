"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const DATA_DIR = path.resolve(process.env.ULUGBEK_DATA_DIR || path.join(__dirname, "..", "data"));
const REPORT_FILE = path.join(DATA_DIR, "agent-reports.jsonl");
const MAX_FILE_BYTES = 250_000;

function secret() {
  return String(process.env.ULUGBEK_PRIVATE_MEMORY_SECRET || "");
}
function safeRepo(repo) {
  const allowed = new Set(String(process.env.GITHUB_ALLOWED_REPOSITORIES || "")
    .split(",").map(x => x.trim().toLowerCase()).filter(Boolean));
  return typeof repo === "string" && /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(repo) &&
    allowed.has(repo.toLowerCase());
}
function status() {
  const sandboxUrl = String(process.env.ULUGBEK_PYTHON_SANDBOX_URL || "");
  let sandboxReady = false;
  try {
    const url = new URL(sandboxUrl);
    sandboxReady = url.protocol === "https:" && !url.username && !url.password &&
      !url.search && !url.hash && Boolean(process.env.ULUGBEK_PYTHON_SANDBOX_TOKEN);
  } catch (_) {}
  return {
    architecture: "single-universal-agent-with-scoped-tools",
    github: {
      ready: Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_ALLOWED_REPOSITORIES),
      mode: "scoped-repository-access",
      repositories: String(process.env.GITHUB_ALLOWED_REPOSITORIES || "").split(",").map(x => x.trim()).filter(Boolean),
      operations: ["read-files", "create-branch", "write-reviewed-files", "open-pull-request"],
      mergeEnabled: false,
      productionDeployEnabled: false
    },
    python: {
      ready: sandboxReady,
      mode: "remote-isolated-sandbox-only",
      localExecutionEnabled: false,
      maxSourceBytes: 20000
    },
    research: { ready: true, mode: "existing-public-web-reader-and-search", robotsAndPrivateNetworkGuards: true },
    documents: {
      ready: false,
      mode: "not-yet-connected",
      supportedFormats: ["PDF", "DOCX", "XLSX"],
      note: "Fayl parser/generator adapterlari ulanmaguncha bu formatlarda bajarildi deb ko‘rsatilmaydi."
    },
    privateMemory: {
      ready: Boolean(secret()),
      mode: "per-user-aes-256-gcm-encrypted-files",
      authentication: "signed-user-token-required"
    },
    reports: { ready: true, storage: REPORT_FILE, format: "append-only-jsonl" },
    renderLogs: { ready: false, mode: "external-render-connector-required" }
  };
}

function verifyUserToken(token) {
  const key = secret();
  if (!key || typeof token !== "string") return null;
  const split = token.lastIndexOf(".");
  if (split < 1) return null;
  const userId = token.slice(0, split);
  const signature = token.slice(split + 1);
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(userId) || !/^[a-f0-9]{64}$/i.test(signature)) return null;
  const expected = crypto.createHmac("sha256", key).update(userId).digest("hex");
  const a = Buffer.from(signature, "hex"), b = Buffer.from(expected, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? userId : null;
}
function userPaths(userId) {
  const id = crypto.createHmac("sha256", secret()).update(userId).digest("hex");
  return path.join(DATA_DIR, "private-memory", id + ".json");
}
function encrypt(value, userId) {
  const key = crypto.createHash("sha256").update(secret()).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(userId));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return { version: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: encrypted.toString("base64") };
}
function decrypt(record, userId) {
  const key = crypto.createHash("sha256").update(secret()).digest();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(record.iv, "base64"));
  decipher.setAAD(Buffer.from(userId));
  decipher.setAuthTag(Buffer.from(record.tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(record.data, "base64")), decipher.final()]).toString("utf8"));
}
async function savePrivateMemory(userId, content) {
  if (!secret()) throw Object.assign(new Error("ULUGBEK_PRIVATE_MEMORY_SECRET sozlanmagan."), { statusCode: 503 });
  const text = typeof content === "string" ? content.trim() : "";
  if (!text || Buffer.byteLength(text) > 20000) throw Object.assign(new Error("Xotira matni 1–20000 bayt bo‘lishi kerak."), { statusCode: 400 });
  const file = userPaths(userId);
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const payload = encrypt({ content: text, updatedAt: new Date().toISOString() }, userId);
  const temp = file + "." + crypto.randomUUID() + ".tmp";
  await fs.writeFile(temp, JSON.stringify(payload), { mode: 0o600 });
  await fs.rename(temp, file);
  return { saved: true, encrypted: true, bytes: Buffer.byteLength(text) };
}
async function readPrivateMemory(userId) {
  if (!secret()) throw Object.assign(new Error("ULUGBEK_PRIVATE_MEMORY_SECRET sozlanmagan."), { statusCode: 503 });
  try {
    const raw = await fs.readFile(userPaths(userId), "utf8");
    const value = decrypt(JSON.parse(raw), userId);
    return { found: true, content: value.content, updatedAt: value.updatedAt };
  } catch (error) {
    if (error.code === "ENOENT") return { found: false, content: "", updatedAt: null };
    throw Object.assign(new Error("Shaxsiy xotirani ochib bo‘lmadi; ma’lumot buzilgan yoki kalit o‘zgargan."), { statusCode: 500 });
  }
}
async function writeReport(report) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const safe = {
    id: "uar_" + crypto.randomUUID().replace(/-/g, "").slice(0, 18),
    task: String(report.task || "").slice(0, 2000),
    status: String(report.status || "unknown").slice(0, 40),
    actions: Array.isArray(report.actions) ? report.actions.slice(0, 30) : [],
    checks: Array.isArray(report.checks) ? report.checks.slice(0, 30) : [],
    limitations: Array.isArray(report.limitations) ? report.limitations.slice(0, 20) : [],
    createdAt: new Date().toISOString()
  };
  await fs.appendFile(REPORT_FILE, JSON.stringify(safe) + "\n", { encoding: "utf8", mode: 0o600 });
  return safe;
}
async function listReports(limit = 20) {
  let raw = "";
  try { raw = await fs.readFile(REPORT_FILE, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  return raw.split("\n").filter(Boolean).slice(-Math.max(1, Math.min(Number(limit) || 20, 50))).reverse()
    .flatMap(line => { try { return [JSON.parse(line)]; } catch (_) { return []; } });
}

async function githubRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options, redirect: "error",
    headers: {
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Authorization": "Bearer " + process.env.GITHUB_TOKEN,
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(15000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error("GitHub API xatosi: HTTP " + response.status + " " + String(data.message || "").slice(0, 180)), { statusCode: response.status });
  return data;
}
async function createPullRequest(input = {}) {
  const repo = String(input.repository || "");
  if (!process.env.GITHUB_TOKEN || !safeRepo(repo)) throw Object.assign(new Error("GitHub ulanishi yo‘q yoki repository allowlist ichida emas."), { statusCode: 403 });
  const files = Array.isArray(input.files) ? input.files : [];
  if (!files.length || files.length > 20) throw Object.assign(new Error("PR uchun 1–20 ta matn fayli kerak."), { statusCode: 400 });
  let total = 0;
  for (const file of files) {
    if (!file || typeof file.path !== "string" || typeof file.content !== "string" ||
        file.path.startsWith("/") || file.path.split("/").includes("..") ||
        /(^|\/)(\.env|.*secret.*|.*credential.*|id_rsa)(\.|$)/i.test(file.path) ||
        file.path.startsWith(".github/workflows/")) {
      throw Object.assign(new Error("Xavfli yoki noto‘g‘ri fayl yo‘li rad etildi."), { statusCode: 400 });
    }
    total += Buffer.byteLength(file.content);
  }
  if (total > MAX_FILE_BYTES) throw Object.assign(new Error("PR fayllari jami 250 KB dan oshmasligi kerak."), { statusCode: 413 });
  const [owner, name] = repo.split("/");
  const api = "https://api.github.com/repos/" + encodeURIComponent(owner) + "/" + encodeURIComponent(name);
  const base = String(input.base || "main");
  if (!/^[a-zA-Z0-9._/-]{1,100}$/.test(base) || base.includes("..")) throw Object.assign(new Error("Base branch noto‘g‘ri."), { statusCode: 400 });
  const ref = await githubRequest(api + "/git/ref/heads/" + encodeURIComponent(base));
  const parentSha = ref.object.sha;
  const parent = await githubRequest(api + "/git/commits/" + parentSha);
  const branch = "ulugbek-agent/" + Date.now().toString(36) + "-" + crypto.randomBytes(3).toString("hex");
  await githubRequest(api + "/git/refs", { method: "POST", body: JSON.stringify({ ref: "refs/heads/" + branch, sha: parentSha }) });
  const blobs = [];
  for (const file of files) {
    const blob = await githubRequest(api + "/git/blobs", { method: "POST", body: JSON.stringify({ content: file.content, encoding: "utf-8" }) });
    blobs.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
  }
  const tree = await githubRequest(api + "/git/trees", { method: "POST", body: JSON.stringify({ base_tree: parent.tree.sha, tree: blobs }) });
  const commit = await githubRequest(api + "/git/commits", { method: "POST", body: JSON.stringify({
    message: String(input.message || "ULUGBEK AI: reviewed agent changes").slice(0, 200),
    tree: tree.sha, parents: [parentSha]
  }) });
  await githubRequest(api + "/git/refs/heads/" + encodeURIComponent(branch), { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) });
  const pr = await githubRequest(api + "/pulls", { method: "POST", body: JSON.stringify({
    title: String(input.title || "ULUGBEK AI agent changes").slice(0, 240),
    body: String(input.body || "Automated proposal. Review the diff and CI before merging.").slice(0, 10000),
    head: branch, base
  }) });
  return { number: pr.number, url: pr.html_url, branch, commit: commit.sha, changedFiles: files.length, merged: false };
}

async function runPythonSandbox(source) {
  const config = status().python;
  if (!config.ready) throw Object.assign(new Error("Izolyatsiyalangan Python sandbox hali ulanmagan. Serverda ULUGBEK_PYTHON_SANDBOX_URL va ULUGBEK_PYTHON_SANDBOX_TOKEN sozlang."), { statusCode: 503 });
  if (typeof source !== "string" || !source.trim() || Buffer.byteLength(source) > 20000) {
    throw Object.assign(new Error("Python kodi 1–20000 bayt bo‘lishi kerak."), { statusCode: 400 });
  }
  const response = await fetch(process.env.ULUGBEK_PYTHON_SANDBOX_URL, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(20000),
    headers: { "Authorization": "Bearer " + process.env.ULUGBEK_PYTHON_SANDBOX_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ language: "python", source, limits: { timeoutSeconds: 8, memoryMb: 128, network: false, filesystem: "ephemeral" } })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error("Sandbox xatosi: HTTP " + response.status), { statusCode: 502 });
  return { ok: payload.ok === true, stdout: String(payload.stdout || "").slice(0, 12000), stderr: String(payload.stderr || "").slice(0, 6000), exitCode: Number.isInteger(payload.exitCode) ? payload.exitCode : null, sandbox: "remote-isolated" };
}

module.exports = {
  status, safeRepo, verifyUserToken, savePrivateMemory, readPrivateMemory,
  writeReport, listReports, createPullRequest, runPythonSandbox
};
