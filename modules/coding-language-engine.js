"use strict";

// Language registry and safe proposal validation for the ULUGBEK AI Coding Engine.
// This module classifies source files; it does not compile, execute, or write them.
const LANGUAGE_EXTENSIONS = Object.freeze({
  Python: [".py"],
  JavaScript: [".js", ".mjs", ".cjs"],
  TypeScript: [".ts", ".tsx"],
  Kotlin: [".kt", ".kts"],
  "HTML/CSS": [".html", ".htm", ".css"],
  "C/C++": [".c", ".h", ".cc", ".cpp", ".cxx", ".hpp", ".hh", ".hxx"],
  Go: [".go"],
  PHP: [".php"],
  Java: [".java"],
  Dart: [".dart"],
  Rust: [".rs"],
  Swift: [".swift"]
});
const TOOLCHAINS = Object.freeze({
  Python: "python3",
  JavaScript: "node",
  TypeScript: "node + tsc",
  Kotlin: "kotlinc + java",
  "HTML/CSS": "HTML/CSS validator or browser",
  "C/C++": "gcc or g++",
  Go: "go",
  PHP: "php",
  Java: "javac + java",
  Dart: "dart",
  Rust: "rustc or cargo",
  Swift: "swift"
});
const EXTENSION_LANGUAGE = new Map(
  Object.entries(LANGUAGE_EXTENSIONS).flatMap(([language, extensions]) =>
    extensions.map(extension => [extension, language])
  )
);
const BLOCKED_SEGMENTS = new Set([
  ".git", ".env", "secrets", "credentials", "node_modules",
  ".venv", "venv", "__pycache__"
]);
const MAX_FILES = 6;
const MAX_FILE_CHARS = 120000;

function supportedLanguages() {
  return Object.entries(LANGUAGE_EXTENSIONS).map(([name, extensions]) => ({
    name, extensions: [...extensions], requiredToolchain: TOOLCHAINS[name],
    executionEnabled: false
  }));
}
function languageForPath(filePath) {
  if (typeof filePath !== "string") return null;
  const name = filePath.split("/").pop() || "";
  const dot = name.lastIndexOf(".");
  return dot < 0 ? null : EXTENSION_LANGUAGE.get(name.slice(dot).toLowerCase()) || null;
}
function validateSourcePath(filePath) {
  if (typeof filePath !== "string" || !filePath || filePath.length > 300) {
    throw new TypeError("Fayl yo‘li noto‘g‘ri");
  }
  if (filePath.includes("\\") || filePath.includes("\0")) {
    throw new TypeError("Fayl yo‘lida taqiqlangan belgi mavjud");
  }
  const parts = filePath.split("/");
  if (filePath.startsWith("/") || parts.some(part => !part || part === "." || part === "..")) {
    throw new TypeError("Repo tashqarisiga chiqish taqiqlangan");
  }
  if (parts.some(part => BLOCKED_SEGMENTS.has(part.toLowerCase()) || part.toLowerCase().startsWith(".env"))) {
    throw new TypeError("Maxfiy yoki xizmat faylini o‘zgartirish taqiqlangan");
  }
  if (!languageForPath(filePath)) throw new TypeError("Bu dasturlash tili qo‘llab-quvvatlanmaydi");
  return filePath;
}
function normalizeGeneratedFiles(files, options = {}) {
  const maxFiles = Number.isInteger(options.maxFiles) ? Math.max(1, Math.min(options.maxFiles, MAX_FILES)) : MAX_FILES;
  const maxFileChars = Number.isInteger(options.maxFileChars) ? Math.max(1, Math.min(options.maxFileChars, MAX_FILE_CHARS)) : MAX_FILE_CHARS;
  if (!Array.isArray(files) || files.length < 1 || files.length > maxFiles) {
    throw new TypeError("Taklif fayllari soni ruxsat etilgan chegarada bo‘lishi kerak");
  }
  const seen = new Set();
  return files.map(item => {
    if (!item || typeof item !== "object" || typeof item.content !== "string") {
      throw new TypeError("Model fayl taklifi noto‘g‘ri");
    }
    const filePath = validateSourcePath(item.path);
    if (seen.has(filePath)) throw new TypeError("Taklifda takrorlangan fayl yo‘li mavjud");
    seen.add(filePath);
    if (!item.content.trim()) throw new TypeError("Bo‘sh kod fayli taklif qilinmaydi");
    if (item.content.length > maxFileChars) throw new TypeError("Taklif qilingan fayl juda katta");
    return {
      path: filePath,
      content: item.content,
      reason: String(item.reason || "").slice(0, 1000),
      language: languageForPath(filePath)
    };
  });
}
function status() {
  return {
    ready: true,
    languageCount: Object.keys(LANGUAGE_EXTENSIONS).length,
    languages: supportedLanguages(),
    codeGenerationIntegrated: false,
    sandboxExecutionEnabled: false,
    automaticRepositoryWrites: false,
    note: "Til aniqlash va taklifni tekshirish tayyor; kod yaratish modeli va izolyatsiyalangan bajarish muhiti alohida ulanadi."
  };
}
module.exports = { LANGUAGE_EXTENSIONS, supportedLanguages, languageForPath, validateSourcePath, normalizeGeneratedFiles, status };
