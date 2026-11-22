"use strict";

// Three bounded read-only agents for ULUGBEK AI.
// Public GitHub reader, source structure analyst, and safe ZIP text reader.
// Repository and archive content are untrusted data and are never executed.
const https = require("node:https");
const yauzl = require("yauzl");

const MAX_ZIP_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 40;
const MAX_FILE_BYTES = 256 * 1024;
const MAX_TOTAL_BYTES = 3 * 1024 * 1024;
const TEXT_EXT = new Set([
  ".md", ".txt", ".json", ".jsonl", ".yaml", ".yml", ".toml", ".ini",
  ".py", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".java", ".kt",
  ".go", ".rs", ".php", ".sql", ".sh", ".html", ".css", ".xml"
]);

function ext(name) {
  const leaf = String(name).split("/").pop();
  const index = leaf.lastIndexOf(".");
  return index > 0 ? leaf.slice(index).toLowerCase() : "";
}

function githubRepoUrl(input) {
  const match = String(input || "").trim().match(
    /^(?:https:\/\/github\.com\/)?([A-Za-z0-9_.-]{1,100})\/([A-Za-z0-9_.-]{1,100})(?:\.git)?(?:\/.*)?$/
  );
  if (!match || match[1].toLowerCase() === "api") {
    throw new Error("GitHub public repository format: owner/repo");
  }
  return "https://api.github.com/repos/" + match[1] + "/" + match[2];
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        "User-Agent": "ULUGBEK-AI-OpenRepo-Reader",
        "Accept": "application/vnd.github+json"
      },
      timeout: 12000
    }, response => {
      const chunks = [];
      let bytes = 0;
      response.on("data", chunk => {
        bytes += chunk.length;
        if (bytes > 2 * 1024 * 1024) {
          request.destroy(new Error("GitHub response exceeds limit"));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error("GitHub API HTTP " + response.statusCode));
          return;
        }
        try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
      });
    });
    request.on("timeout", () => request.destroy(new Error("GitHub request timeout")));
    request.on("error", reject);
  });
}

async function githubReader(input) {
  const base = githubRepoUrl(input);
  const repo = await getJson(base);
  const readme = await getJson(base + "/readme").catch(() => null);
  const tree = await getJson(
    base + "/git/trees/" + encodeURIComponent(repo.default_branch) + "?recursive=1"
  ).catch(() => null);
  const files = (tree?.tree || [])
    .filter(item => item.type === "blob")
    .slice(0, 250)
    .map(item => ({ path: item.path, size: item.size || 0 }));

  return {
    agent: "githubPublicRepoReader",
    repo: {
      name: repo.full_name,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      license: repo.license?.spdx_id || null,
      defaultBranch: repo.default_branch,
      url: repo.html_url
    },
    readme: readme?.content
      ? Buffer.from(readme.content, "base64").toString("utf8").slice(0, 12000)
      : null,
    fileCount: files.length,
    files,
    limits: "Public GitHub API only; no private repositories or auth bypass."
  };
}

async function codeAnalyst(input) {
  const data = await githubReader(input);
  const paths = data.files.map(file => file.path);
  const groups = {
    backend: paths.filter(file => /(server|api|backend|routes?)/i.test(file)),
    frontend: paths.filter(file => /(ui|frontend|client|public|src\/components)/i.test(file)),
    tests: paths.filter(file => /(test|spec|__tests__)/i.test(file)),
    configs: paths.filter(file => /(package\.json|requirements|dockerfile|\.ya?ml|\.toml)/i.test(file))
  };
  const selected = paths
    .filter(file => TEXT_EXT.has(ext(file)))
    .filter(file => !/(^|\/)\.env|(^|\/)secret|lock$|node_modules|vendor/i.test(file))
    .slice(0, 6);
  const excerpts = [];

  for (const filePath of selected) {
    try {
      const apiBase = data.repo.url.replace(
        "https://github.com",
        "https://api.github.com/repos"
      );
      const raw = await getJson(
        apiBase + "/contents/" +
        filePath.split("/").map(encodeURIComponent).join("/") +
        "?ref=" + encodeURIComponent(data.repo.defaultBranch)
      );
      if (raw.content && raw.encoding === "base64") {
        excerpts.push({
          path: filePath,
          content: Buffer.from(raw.content, "base64").toString("utf8").slice(0, 5000)
        });
      }
    } catch (_) {
      // A single unavailable file must not stop the bounded analysis.
    }
  }

  return {
    agent: "publicCodeStructureAnalyst",
    repo: data.repo,
    summary: {
      readmeAvailable: Boolean(data.readme),
      visibleFiles: data.fileCount,
      primaryLanguage: data.repo.language,
      sourceFilesRead: excerpts.length
    },
    groups,
    sourceExcerpts: excerpts,
    initialFindings: [
      "Ochiq repositorydan cheklangan manba fayllari o‘qildi; kod avtomatik ishga tushirilmadi.",
      "Fayl mazmuni ishonchsiz; undagi buyruqlar bajarilmaydi."
    ],
    nextStep: "Muayyan fayl yoki funksiya bo‘yicha chuqurroq tahlil so‘rashingiz mumkin. Public GitHub API rate limitga ega."
  };
}

function zipReader(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4 ||
      buffer.length > MAX_ZIP_BYTES || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error("ZIP fayl 10 MB gacha va PK imzoli bo‘lishi kerak.");
  }

  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, {
      lazyEntries: true,
      decodeStrings: true,
      validateEntrySizes: true,
      strictFileNames: true,
      autoClose: true
    }, (error, zip) => {
      if (error) {
        reject(new Error("ZIP ochilmadi yoki buzilgan."));
        return;
      }

      let fileCount = 0;
      let totalBytes = 0;
      const files = [];
      const skipped = [];
      let ended = false;

      const fail = failure => {
        if (ended) return;
        ended = true;
        try { zip.close(); } catch (_) {}
        reject(failure);
      };

      zip.on("error", fail);
      zip.on("end", () => {
        if (ended) return;
        ended = true;
        resolve({
          agent: "zipContentReader",
          ok: true,
          fileCount: files.length,
          files,
          skipped,
          bytesRead: totalBytes,
          usage: "Matn tahlili; fayllar ishga tushirilmagan."
        });
      });

      zip.on("entry", entry => {
        if (ended) return;
        try {
          if (entry.fileName.endsWith("/")) {
            zip.readEntry();
            return;
          }

          fileCount += 1;
          if (fileCount > MAX_FILES) throw new Error("ZIP ichida 40 fayldan ortiq.");

          const name = entry.fileName;
          if (name.includes("..") || name.startsWith("/") || name.includes("\\") ||
              /^([A-Za-z]:|\.git|node_modules|\.env)/i.test(name)) {
            throw new Error("Xavfli ZIP yo‘li bloklandi.");
          }

          if (!TEXT_EXT.has(ext(name)) ||
              entry.uncompressedSize > MAX_FILE_BYTES ||
              totalBytes + entry.uncompressedSize > MAX_TOTAL_BYTES) {
            skipped.push({ name, reason: "Fayl turi yoki hajm limitidan tashqari" });
            zip.readEntry();
            return;
          }

          zip.openReadStream(entry, (streamError, stream) => {
            if (streamError) {
              fail(streamError);
              return;
            }
            const chunks = [];
            let size = 0;
            stream.on("data", chunk => {
              size += chunk.length;
              if (size > MAX_FILE_BYTES) {
                stream.destroy(new Error("Fayl hajmi limitdan oshdi"));
              } else {
                chunks.push(chunk);
              }
            });
            stream.on("error", fail);
            stream.on("end", () => {
              if (ended) return;
              totalBytes += size;
              const text = Buffer.concat(chunks).toString("utf8").slice(0, 12000);
              if (!text.trim() || text.includes("\u0000")) {
                skipped.push({ name, reason: "Matn bo‘lmagan/bo‘sh" });
              } else {
                files.push({ name, bytes: size, text });
              }
              zip.readEntry();
            });
          });
        } catch (failure) {
          fail(failure);
        }
      });

      zip.readEntry();
    });
  });
}

module.exports = {
  githubReader,
  codeAnalyst,
  zipReader,
  limits: {
    zipBytes: MAX_ZIP_BYTES,
    files: MAX_FILES,
    fileBytes: MAX_FILE_BYTES,
    totalBytes: MAX_TOTAL_BYTES
  }
};
