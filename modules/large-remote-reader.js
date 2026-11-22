"use strict";

// Large public GitHub repository reader: reads API metadata and selected raw text files.
// It does not download repository ZIP archives or execute repository code.
const https = require("node:https");
const MAX_TREE_ITEMS = 5000;
const MAX_FILES_TO_READ = 30;
const MAX_FILE_BYTES = 160 * 1024;
const MAX_TOTAL_BYTES = 1024 * 1024;
const ALLOWED_EXT = new Set([".md",".txt",".json",".yaml",".yml",".toml",".ini",".py",".js",".mjs",".cjs",".ts",".tsx",".jsx",".java",".kt",".go",".rs",".php",".sql",".sh",".html",".css",".xml",".gradle"]);
const BLOCKED = /(^|\/)\.(?:env|git)(?:\/|$)|(^|\/)(?:node_modules|vendor|dist|build|coverage)(?:\/|$)|secret|credential|token|private/i;

function requestText(url, maxBytes = MAX_FILE_BYTES) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "ULUGBEK-AI-Large-Repo-Reader", "Accept": "application/vnd.github+json" }, timeout: 15000 }, res => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume(); reject(new Error("Remote HTTP " + res.statusCode)); return;
      }
      let size = 0; const chunks = [];
      res.on("data", chunk => { size += chunk.length; if (size > maxBytes) { req.destroy(new Error("Remote file size limit exceeded")); return; } chunks.push(chunk); });
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    req.on("timeout", () => req.destroy(new Error("Remote request timeout")));
    req.on("error", reject);
  });
}
function parseRepo(input) {
  const match = String(input || "").trim().match(/^(?:https:\/\/github\.com\/)?([A-Za-z0-9_.-]{1,100})\/([A-Za-z0-9_.-]{1,100})(?:\.git)?(?:\/.*)?$/);
  if (!match || match[1].toLowerCase() === "api") throw new Error("GitHub public repository: owner/repo format required.");
  return { owner: match[1], repo: match[2], base: "https://api.github.com/repos/" + match[1] + "/" + match[2] };
}
async function readLargeRepository(input, options = {}) {
  const { owner, repo, base } = parseRepo(input);
  const maxFiles = Math.min(MAX_FILES_TO_READ, Math.max(1, Number(options.maxFiles) || MAX_FILES_TO_READ));
  const meta = JSON.parse(await requestText(base, 256 * 1024));
  const tree = JSON.parse(await requestText(base + "/git/trees/" + encodeURIComponent(meta.default_branch) + "?recursive=1", 5 * 1024 * 1024));
  const all = Array.isArray(tree.tree) ? tree.tree : [];
  const candidates = all.filter(item => item.type === "blob" && !BLOCKED.test(item.path) && ALLOWED_EXT.has("." + (item.path.split(".").pop() || "").toLowerCase()) && (item.size || 0) <= MAX_FILE_BYTES);
  const selected = candidates.slice(0, maxFiles);
  const files = []; let totalBytes = 0;
  for (const item of selected) {
    if (totalBytes >= MAX_TOTAL_BYTES) break;
    try {
      const raw = await requestText("https://raw.githubusercontent.com/" + owner + "/" + repo + "/" + encodeURIComponent(meta.default_branch) + "/" + item.path.split("/").map(encodeURIComponent).join("/"), Math.min(MAX_FILE_BYTES, MAX_TOTAL_BYTES - totalBytes));
      const bytes = Buffer.byteLength(raw);
      if (raw.includes("\\u0000")) continue;
      files.push({ path: item.path, size: bytes, content: raw.slice(0, 10000) });
      totalBytes += bytes;
    } catch (error) { files.push({ path: item.path, skipped: error.message }); }
  }
  return {
    ok: true, repository: meta.full_name, description: meta.description, defaultBranch: meta.default_branch,
    repositoryReportedSizeKb: meta.size, treeItemsReturned: all.length, treeTruncated: tree.truncated === true,
    textFilesFound: candidates.length, filesRead: files.filter(f => f.content !== undefined).length,
    files, limits: { maxFiles, maxFileBytes: MAX_FILE_BYTES, maxTotalBytes: MAX_TOTAL_BYTES },
    note: "GitHub API/raw files are read selectively; no ZIP is downloaded. API tree truncation and GitHub rate limits can limit completeness. Repository code is untrusted and never executed."
  };
}
module.exports = { readLargeRepository, limits: { maxTreeItems: MAX_TREE_ITEMS, maxFiles: MAX_FILES_TO_READ, maxFileBytes: MAX_FILE_BYTES, maxTotalBytes: MAX_TOTAL_BYTES } };
