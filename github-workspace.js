"use strict";

const OWNER = process.env.DEVELOPER_AGENT_REPO_OWNER || "Ulugbek4801741";
const REPO = process.env.DEVELOPER_AGENT_REPO_NAME || "ulugbek-ai";
const BASE_BRANCH = process.env.DEVELOPER_AGENT_BRANCH || "main";
const WORK_BRANCH = process.env.AGENT_GITHUB_WORK_BRANCH || "ulugbek-ai-agent-work";
const MAX_BYTES = 256 * 1024;
const BLOCKED = /(^|\/)(?:\.git|node_modules|data|\.env(?:\.|$)|secrets?|credentials?)(?:\/|$)|(^|\/)\.github\/workflows(?:\/|$)|\.(?:pem|key|p12|pfx)$/i;

function fail(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
function token() {
  const value = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!value) fail("GitHub token serverda sozlanmagan. Render Environment bo‘limiga GITHUB_TOKEN qo‘shish kerak.", 503);
  return value;
}
function safePath(value) {
  const file = String(value || "").replace(/\\/g, "/").trim();
  if (!file || file.length > 240 || file.startsWith("/") || file.split("/").some(part => !part || part === "." || part === "..") || BLOCKED.test(file)) {
    fail("Fayl yo‘li ruxsat etilmagan yoki xavfli.");
  }
  return file;
}
async function api(endpoint, options = {}) {
  const response = await fetch("https://api.github.com" + endpoint, {
    method: options.method || "GET",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer " + token(),
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ULUGBEK-AI-GitHub-Workspace/1.0",
      ...(options.body ? { "Content-Type": "application/json" } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(20000),
    redirect: "error"
  });
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch (_) { data = {}; }
  if (!response.ok) {
    const message = response.status === 401 || response.status === 403
      ? "GitHub ruxsati yetarli emas yoki token yaroqsiz."
      : response.status === 404 ? "GitHub fayli yoki tarmog‘i topilmadi."
      : (data.message || "GitHub API xatosi: " + response.status);
    fail(message, response.status === 404 ? 404 : response.status === 401 || response.status === 403 ? 403 : 502);
  }
  return data;
}
function base() { return "/repos/" + encodeURIComponent(OWNER) + "/" + encodeURIComponent(REPO); }
async function ref(branch) { return api(base() + "/git/ref/heads/" + encodeURIComponent(branch)); }
async function ensureWorkBranch() {
  try { return await ref(WORK_BRANCH); }
  catch (error) {
    if (error.status !== 404) throw error;
    const baseRef = await ref(BASE_BRANCH);
    try {
      await api(base() + "/git/refs", { method: "POST", body: {
        ref: "refs/heads/" + WORK_BRANCH, sha: baseRef.object.sha
      }});
    } catch (createError) {
      if (createError.status !== 422) throw createError;
    }
    return ref(WORK_BRANCH);
  }
}
async function listFiles(prefix = "") {
  const normalized = prefix ? safePath(prefix).replace(/\/$/, "") : "";
  const head = await ref(WORK_BRANCH).catch(async error => {
    if (error.status === 404) return ref(BASE_BRANCH);
    throw error;
  });
  const tree = await api(base() + "/git/trees/" + encodeURIComponent(head.object.sha) + "?recursive=1");
  if (tree.truncated) fail("Repo juda katta; fayllar ro‘yxati to‘liq olinmadi.", 503);
  return (tree.tree || []).filter(item => item.type === "blob" && !BLOCKED.test(item.path) &&
    (!normalized || item.path.startsWith(normalized + "/") || item.path === normalized))
    .slice(0, 500).map(item => ({ path: item.path, size: item.size, sha: item.sha }));
}
async function readFile(filePath) {
  const file = safePath(filePath);
  let data;
  try { data = await api(base() + "/contents/" + file.split("/").map(encodeURIComponent).join("/") + "?ref=" + encodeURIComponent(WORK_BRANCH)); }
  catch (error) {
    if (error.status !== 404) throw error;
    data = await api(base() + "/contents/" + file.split("/").map(encodeURIComponent).join("/") + "?ref=" + encodeURIComponent(BASE_BRANCH));
  }
  if (data.type !== "file" || !data.content) fail("Bu oddiy matnli fayl emas yoki hajmi juda katta.", 415);
  const decoded = Buffer.from(data.content.replace(/\n/g, ""), "base64");
  if (decoded.length > MAX_BYTES) fail("Fayl 256 KB dan katta; bu panel orqali ochilmaydi.", 413);
  return { path: file, content: decoded.toString("utf8"), sha: data.sha, branch: data.url?.includes(WORK_BRANCH) ? WORK_BRANCH : BASE_BRANCH };
}
async function writeFile(filePath, content, message) {
  const file = safePath(filePath);
  if (typeof content !== "string" || Buffer.byteLength(content, "utf8") > MAX_BYTES) fail("Fayl matni 256 KB dan oshmasligi kerak.");
  const head = await ensureWorkBranch();
  let existing = null;
  try { existing = await api(base() + "/contents/" + file.split("/").map(encodeURIComponent).join("/") + "?ref=" + encodeURIComponent(WORK_BRANCH)); }
  catch (error) { if (error.status !== 404) throw error; }
  const policy = require("./agent-permissions").snapshot().capabilities;
  const isUpdate = !!existing;
  if (!(policy.branch_write?.enabled)) fail("Admin branch_write ruxsatini yoqmagan.", 403);
  if (isUpdate && !policy.file_update?.enabled) fail("Admin file_update ruxsatini yoqmagan.", 403);
  if (!isUpdate && !policy.file_create?.enabled) fail("Admin file_create ruxsatini yoqmagan.", 403);
  const result = await api(base() + "/contents/" + file.split("/").map(encodeURIComponent).join("/"), {
    method: "PUT",
    body: {
      message: String(message || (isUpdate ? "ULUGBEK AI: update " : "ULUGBEK AI: create ") + file).slice(0, 200),
      content: Buffer.from(content, "utf8").toString("base64"),
      branch: WORK_BRANCH,
      ...(existing ? { sha: existing.sha } : {})
    }
  });
  return { path: file, branch: WORK_BRANCH, commit: result.commit?.sha || null, url: result.content?.html_url || null, operation: isUpdate ? "updated" : "created", baseCommit: head.object.sha };
}
async function deleteFile(filePath, message) {
  const file = safePath(filePath);
  const policy = require("./agent-permissions").snapshot().capabilities;
  if (!policy.branch_write?.enabled || !policy.file_delete?.enabled) fail("Admin branch_write va file_delete ruxsatlarini yoqishi kerak.", 403);
  const existing = await api(base() + "/contents/" + file.split("/").map(encodeURIComponent).join("/") + "?ref=" + encodeURIComponent(WORK_BRANCH));
  const result = await api(base() + "/contents/" + file.split("/").map(encodeURIComponent).join("/"), {
    method: "DELETE",
    body: { message: String(message || "ULUGBEK AI: delete " + file).slice(0, 200), sha: existing.sha, branch: WORK_BRANCH }
  });
  return { path: file, branch: WORK_BRANCH, commit: result.commit?.sha || null, operation: "deleted" };
}
function status() {
  return {
    repository: OWNER + "/" + REPO, baseBranch: BASE_BRANCH, workBranch: WORK_BRANCH,
    tokenConfigured: !!(process.env.GITHUB_TOKEN || process.env.GH_TOKEN),
    mode: "branch-only", mainBranchWrite: false, maxFileBytes: MAX_BYTES
  };
}
module.exports = { listFiles, readFile, writeFile, deleteFile, status, safePath };
