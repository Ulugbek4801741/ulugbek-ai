"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const DATA_DIR = path.resolve(process.env.ULUGBEK_DATA_DIR || path.join(__dirname, "..", "data"));
const STORE_PATH = path.join(DATA_DIR, "error-learning.json");
const MAX_FAILURES = 1000;
const MAX_FEEDBACK = 500;
const FAILURE_PATTERNS = [
  /hozircha tasdiqlangan bilimlar bazamdan/i,
  /ishonchli javob topa olmadim/i,
  /so‘rov bajarilmadi|so'rov bajarilmadi/i,
  /mahalliy mantiqiy mexanizm ishlamadi/i,
  /internet qidiruvi vaqtincha ishlamadi/i,
  /mos vakansiya natijalarini ololmadi/i
];

function hash(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}
function normalize(value) {
  return String(value || "").normalize("NFC").toLocaleLowerCase()
    .replace(/[’‘ʻʼ]/g, "'").replace(/\s+/g, " ").trim();
}
function inferIntent(prompt) {
  const text = normalize(prompt);
  if (/\b(ish|vakansiya|job|работа)\b/.test(text)) return "job-search";
  if (/\b(kod|dastur|dasturlash\\w*|python|javascript|debug|xato)\b/.test(text)) return "programming";
  if (/\b(reja|rejalashtir|bosqich|plan|roadmap)\b/.test(text)) return "planning";
  if (/\b(yarat|create|modul|ai|si)\b/.test(text)) return "creation";
  if (/\b(kogon|buxoro|toshkent|samarqand)\b/.test(text)) return "location-context";
  return "general";
}
async function readStore() {
  try {
    const parsed = JSON.parse(await fs.readFile(STORE_PATH, "utf8"));
    return {
      failures: Array.isArray(parsed.failures) ? parsed.failures.slice(-MAX_FAILURES) : [],
      feedback: Array.isArray(parsed.feedback) ? parsed.feedback.slice(-MAX_FEEDBACK) : []
    };
  } catch (error) {
    if (error.code === "ENOENT") return { failures: [], feedback: [] };
    throw error;
  }
}
let writeQueue = Promise.resolve();
async function writeStore(store) {
  const snapshot = JSON.stringify({
    version: 1,
    updatedAt: new Date().toISOString(),
    failures: store.failures.slice(-MAX_FAILURES),
    feedback: store.feedback.slice(-MAX_FEEDBACK)
  }, null, 2);
  writeQueue = writeQueue.catch(() => {}).then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const temp = STORE_PATH + ".tmp";
    await fs.writeFile(temp, snapshot, { mode: 0o600 });
    await fs.rename(temp, STORE_PATH);
  });
  return writeQueue;
}
async function recordFailure({ prompt, response, statusCode = 200, reason = "low-confidence" }) {
  const question = String(prompt || "").trim().slice(0, 4000);
  if (!question) return false;
  const responseText = typeof response === "string" ? response : "";
  const detected = FAILURE_PATTERNS.some(pattern => pattern.test(responseText));
  if (!detected && Number(statusCode) < 400 && reason !== "low-confidence") return false;
  const store = await readStore();
  const promptHash = hash(normalize(question));
  const existing = store.failures.find(item => item.promptHash === promptHash && item.reason === reason);
  if (existing) {
    existing.occurrences = Math.min(999, (existing.occurrences || 1) + 1);
    existing.lastSeenAt = new Date().toISOString();
  } else {
    store.failures.push({
      id: crypto.randomUUID(),
      promptHash,
      intent: inferIntent(question),
      reason: String(reason).slice(0, 80),
      statusCode: Number(statusCode) || 200,
      occurrences: 1,
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      reviewStatus: "needs-review"
    });
  }
  await writeStore(store);
  return true;
}
async function submitFeedback({ prompt, correction = "", rating = "negative", category = "incorrect-answer" }) {
  const question = String(prompt || "").trim();
  const corrected = String(correction || "").trim();
  if (!question || question.length > 4000 || corrected.length > 4000) {
    const error = new Error("Savol 1–4000, tuzatish esa 0–4000 belgi bo‘lishi kerak.");
    error.statusCode = 400;
    throw error;
  }
  if (rating !== "negative" && rating !== "positive") {
    const error = new Error("rating positive yoki negative bo‘lishi kerak.");
    error.statusCode = 400;
    throw error;
  }
  const store = await readStore();
  const item = {
    id: crypto.randomUUID(),
    prompt: question,
    promptHash: hash(normalize(question)),
    correction: corrected,
    intent: inferIntent(question),
    rating,
    category: String(category).slice(0, 80),
    reviewStatus: "pending-review",
    createdAt: new Date().toISOString()
  };
  store.feedback.push(item);
  await writeStore(store);
  return { id: item.id, reviewStatus: item.reviewStatus };
}
async function listCandidates() {
  const store = await readStore();
  return {
    failures: store.failures.slice(-100),
    feedback: store.feedback.filter(item => item.reviewStatus !== "rejected").slice(-100)
  };
}
async function reviewFeedback(id, decision) {
  if (!["approved", "rejected"].includes(decision)) {
    const error = new Error("Qaror approved yoki rejected bo‘lishi kerak.");
    error.statusCode = 400;
    throw error;
  }
  const store = await readStore();
  const item = store.feedback.find(entry => entry.id === id);
  if (!item) return false;
  item.reviewStatus = decision;
  item.reviewedAt = new Date().toISOString();
  await writeStore(store);
  return true;
}
async function status() {
  const store = await readStore();
  return {
    enabled: true,
    version: 1,
    failureCount: store.failures.length,
    feedbackCount: store.feedback.length,
    pendingReview: store.feedback.filter(item => item.reviewStatus === "pending-review").length,
    approvedCorrections: store.feedback.filter(item => item.reviewStatus === "approved").length,
    autoLearningFromUnverifiedCorrections: false,
    note: "Xato signallari avtomatik qayd etiladi; foydalanuvchi tuzatishlari administrator ko‘rigisiz fakt sifatida o‘rgatilmaydi."
  };
}
function middleware() {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = payload => {
      const reply = typeof payload?.reply === "string" ? payload.reply : "";
      const errorText = typeof payload?.error === "string" ? payload.error : "";
      const statusCode = res.statusCode || 200;
      if (statusCode >= 400 || FAILURE_PATTERNS.some(pattern => pattern.test(reply + " " + errorText))) {
        void recordFailure({
          prompt: req.body?.message || "",
          response: reply + " " + errorText,
          statusCode,
          reason: statusCode >= 400 ? "http-error" : "low-confidence"
        }).catch(error => console.error("Error-learning capture failed:", error.message));
      }
      return originalJson(payload);
    };
    next();
  };
}

module.exports = {
  inferIntent, normalize, recordFailure, submitFeedback,
  listCandidates, reviewFeedback, status, middleware
};
