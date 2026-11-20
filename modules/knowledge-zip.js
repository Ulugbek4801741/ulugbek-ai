"use strict";

// Safe ZIP import/export for the retrieval-only knowledge base.
// ZIP members are read as streams and never extracted to the filesystem or executed.
const crypto = require("node:crypto");
const yauzl = require("yauzl");
const yazl = require("yazl");

const MAX_ARCHIVE_BYTES = 20 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 40 * 1024 * 1024;
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_FILES = 100;
const ALLOWED_EXTENSIONS = new Set([
  ".txt", ".md", ".markdown", ".csv", ".json", ".jsonl", ".xml", ".yaml", ".yml",
  ".py", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".java", ".kt", ".go",
  ".rs", ".php", ".sql", ".sh", ".css", ".html", ".htm", ".toml", ".ini"
]);
const SECRET_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /\b(?:sk-[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/,
  /\b(?:AWS_SECRET_ACCESS_KEY|OPENAI_API_KEY|GEMINI_API_KEY|DATABASE_URL)\s*[:=]\s*\S+/i
];

function validateEntryName(name) {
  const value = String(name || "").normalize("NFC");
  if (!value || value.length > 240 || value.includes("\0") || value.includes("\\") ||
      value.startsWith("/") || /^[A-Za-z]:/.test(value)) return false;
  const parts = value.split("/");
  if (parts.some(part => part === ".." || part === ".")) return false;
  if (parts.some(part => /^\.env(?:\.|$)/i.test(part) || /^\.git$/i.test(part) ||
      /^node_modules$/i.test(part) || /^\.ssh$/i.test(part))) return false;
  return true;
}
function extensionOf(name) {
  const leaf = String(name).split("/").pop() || "";
  const dot = leaf.lastIndexOf(".");
  return dot > 0 ? leaf.slice(dot).toLowerCase() : "";
}
function containsSecret(text) {
  return SECRET_PATTERNS.some(pattern => pattern.test(text));
}
function languageFor(name) {
  const ext = extensionOf(name);
  return ({
    ".py": "python", ".js": "javascript", ".mjs": "javascript", ".cjs": "javascript",
    ".ts": "typescript", ".tsx": "typescript", ".jsx": "javascript",
    ".java": "java", ".kt": "kotlin", ".go": "go", ".rs": "rust",
    ".php": "php", ".sql": "sql", ".sh": "shell", ".html": "html",
    ".htm": "html", ".css": "css", ".json": "json", ".xml": "xml",
    ".yaml": "yaml", ".yml": "yaml", ".md": "markdown", ".markdown": "markdown"
  })[ext] || "auto";
}
function readEntry(zipfile, entry) {
  return new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, (error, stream) => {
      if (error) return reject(error);
      const chunks = [];
      let size = 0;
      stream.on("data", chunk => {
        size += chunk.length;
        if (size > MAX_FILE_BYTES) {
          stream.destroy(new Error("ZIP ichidagi bitta fayl 1 MiB limitdan oshdi."));
          return;
        }
        chunks.push(chunk);
      });
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks, size)));
    });
  });
}

async function importKnowledgeZip(buffer, knowledgeStore) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw Object.assign(new Error("ZIP fayl bo‘sh yoki noto‘g‘ri."), { statusCode: 400 });
  }
  if (buffer.length > MAX_ARCHIVE_BYTES) {
    throw Object.assign(new Error("ZIP arxiv 20 MiB limitdan oshdi."), { statusCode: 413 });
  }
  const archiveHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const imported = [];
  const skipped = [];
  let expandedBytes = 0;
  let fileCount = 0;

  await new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, {
      lazyEntries: true, decodeStrings: true, validateEntrySizes: true,
      strictFileNames: true, autoClose: true
    }, (openError, zipfile) => {
      if (openError) return reject(Object.assign(new Error("ZIP arxiv ochilmadi yoki buzilgan."), { statusCode: 400 }));
      let settled = false;
      const fail = error => {
        if (settled) return;
        settled = true;
        try { zipfile.close(); } catch (_) {}
        reject(error);
      };
      zipfile.on("error", fail);
      zipfile.on("end", () => {
        if (settled) return;
        settled = true;
        resolve();
      });
      zipfile.on("entry", async entry => {
        if (settled) return;
        try {
          const name = String(entry.fileName || "");
          if (!validateEntryName(name)) throw Object.assign(new Error("ZIP ichida xavfli fayl yo‘li aniqlandi."), { statusCode: 400 });
          const unixMode = (Number(entry.externalFileAttributes || 0) >>> 16) & 0xffff;
          if ((unixMode & 0o170000) === 0o120000) {
            throw Object.assign(new Error("ZIP ichidagi symbolic link qabul qilinmaydi."), { statusCode: 400 });
          }
          if (entry.generalPurposeBitFlag & 1) {
            throw Object.assign(new Error("Parol bilan shifrlangan ZIP fayllar qabul qilinmaydi."), { statusCode: 400 });
          }
          if (name.endsWith("/")) { zipfile.readEntry(); return; }
          fileCount += 1;
          if (fileCount > MAX_FILES) throw Object.assign(new Error("ZIP ichida 100 tadan ortiq fayl bor."), { statusCode: 413 });
          const ext = extensionOf(name);
          if (!ALLOWED_EXTENSIONS.has(ext)) {
            skipped.push({ name, reason: "Qo‘llab-quvvatlanmaydigan fayl turi." });
            zipfile.readEntry();
            return;
          }
          if (Number(entry.uncompressedSize) > MAX_FILE_BYTES ||
              expandedBytes + Number(entry.uncompressedSize) > MAX_EXPANDED_BYTES) {
            throw Object.assign(new Error("ZIP ochilgandagi umumiy hajm 40 MiB limitdan yoki fayl 1 MiB limitdan oshdi."), { statusCode: 413 });
          }
          const data = await readEntry(zipfile, entry);
          expandedBytes += data.length;
          const content = data.toString("utf8").replace(/^\uFEFF/, "").trim();
          if (!content || data.includes(0)) {
            skipped.push({ name, reason: "Bo‘sh yoki matn bo‘lmagan fayl." });
            zipfile.readEntry();
            return;
          }
          if (containsSecret(content)) {
            skipped.push({ name, reason: "Maxfiy kalit yoki ulanish ma’lumoti aniqlangan." });
            zipfile.readEntry();
            return;
          }
          if (content.length < 80) {
            skipped.push({ name, reason: "Bilim bazasiga kiritish uchun matn juda qisqa." });
            zipfile.readEntry();
            return;
          }
          const saved = await knowledgeStore.ingest({
            title: name.split("/").pop().slice(0, 300),
            author: "ZIP import",
            source: "user://zip/" + archiveHash + "/" + name,
            language: languageFor(name),
            content
          });
          imported.push({ name, documentId: saved.documentId, chunks: saved.chunks });
          zipfile.readEntry();
        } catch (error) { fail(error); }
      });
      zipfile.readEntry();
    });
  });

  return {
    ok: true, archiveSha256: archiveHash, importedFiles: imported.length,
    imported, skipped, expandedBytes, usage: "retrieval-only; imported code is never executed"
  };
}

async function createKnowledgeZip(knowledgeStore) {
  const documents = await knowledgeStore.exportDocuments();
  const zipfile = new yazl.ZipFile();
  const manifest = {
    format: "ulugbek-ai-knowledge-zip-v1",
    createdAt: new Date().toISOString(),
    documents: documents.length,
    usage: "retrieval-only; no executable files are run"
  };
  const rows = documents.map(item => JSON.stringify(item)).join("\n") + (documents.length ? "\n" : "");
  zipfile.addBuffer(Buffer.from(JSON.stringify(manifest, null, 2) + "\n"), "manifest.json");
  zipfile.addBuffer(Buffer.from(rows, "utf8"), "knowledge/documents.jsonl");
  zipfile.end();
  return { outputStream: zipfile.outputStream, documents: documents.length };
}

module.exports = {
  importKnowledgeZip, createKnowledgeZip, validateEntryName, containsSecret,
  limits: { archiveBytes: MAX_ARCHIVE_BYTES, expandedBytes: MAX_EXPANDED_BYTES, fileBytes: MAX_FILE_BYTES, files: MAX_FILES }
};
