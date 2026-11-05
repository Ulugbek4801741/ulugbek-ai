"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");
const REPORT_INTERVAL_MS = 5 * 60 * 1000;
const MAX_REPORTS = 48;

function safeStatus(read) {
  try { const value = read(); return value && typeof value === "object" ? value : {}; }
  catch (error) { return { available: false, error: String(error?.message || "status unavailable").slice(0, 120) }; }
}
function countTasks(tasks) {
  const counts = { total: 0, pending: 0, running: 0, completed: 0, failed: 0, awaitingReview: 0 };
  if (!Array.isArray(tasks)) return counts;
  counts.total = tasks.length;
  for (const task of tasks) {
    const state = String(task?.status || task?.state || "").toLowerCase();
    if (/run|progress/.test(state)) counts.running += 1;
    else if (/complete|done|success/.test(state)) counts.completed += 1;
    else if (/fail|error/.test(state)) counts.failed += 1;
    else if (/review|approval|pending_review/.test(state)) counts.awaitingReview += 1;
    else counts.pending += 1;
  }
  return counts;
}
function buildReport(snapshot, now = new Date()) {
  const learning = snapshot.learning || {}, model = snapshot.model || {}, developer = snapshot.developer || {}, tasks = snapshot.tasks || {};
  const date = now.toLocaleString("uz-UZ", { timeZone: process.env.REPORT_TIME_ZONE || "Asia/Tashkent" });
  const statusUnavailable = snapshot.available === false;
  const lines = [
    "ULUGBEK AI tizim hisoboti.",
    "Hisobot vaqti: " + date + ".",
    "Server ishlash vaqti: " + Math.max(0, Math.floor(snapshot.uptimeSeconds || 0)) + " soniya.",
    "Aql markazi: " + (statusUnavailable ? "holatini aniqlab bo‘lmadi." : model.configured ? "shaxsiy mahalliy model ulangan." : "mahalliy qoidaviy rejim; to‘liq neyron model ulanmagan."),
    "O‘rganish moduli: " + (learning.running === true ? "ishlayapti." : learning.enabled === false ? "o‘chirilgan." : "holati tekshirilmoqda."),
    "O‘rganish sikllari: " + (Number(learning.cycles) || 0) + "; saqlangan bilim nomzodlari: " + (Number(learning.saved) || 0) + ".",
    "Dasturchi moduli: " + (statusUnavailable ? "holatini aniqlab bo‘lmadi." : developer.enabled === false ? "o‘chirilgan." : developer.running === true ? "ishlayapti." : "holati tekshirilmoqda."),
    "Agentlar: chatda bitta universal agent faol; boshqa mutaxassis agentlar mustaqil ishga tushirilmagan.",
    "Internet tadqiqoti: faqat ochiq manbalarni o‘qish va tekshirish rejimi; tashqi yozish amallari yo‘q.",
    "Bilim va xotira: serverdagi lokal fayl ombori; bir nechta server nusxasi bilan sinxron ishlash kafolatlanmagan.",
    "Ovoz: oddiy chat ovozi qurilma/brauzer imkoniyatiga bog‘liq; fon hisobotlari maxsus Android ilovasida ishlaydi.",
    "Rasm yaratish moduli: " + (snapshot.images?.enabled ? "ulangan." : "serverda ulanmagan."),
    "Video yaratish moduli: " + (snapshot.videos?.enabled ? "ulangan." : "serverda ulanmagan."),
    "Vazifalar: jami " + tasks.total + ", bajarilgan " + tasks.completed + ", jarayonda " + tasks.running + ", tekshiruv kutayotgan " + tasks.awaitingReview + ", xatoli " + tasks.failed + ".",
    "Mustaqil takomillashtirish: " + (snapshot.improvements?.counts?.pendingApproval || 0) + " ta taklif administrator ko‘rigini kutmoqda; kodni o‘zgartirish va deploy avtomatik bajarilmaydi.",
    "Xavfsizlik: tashqi yozish, kodni ishga tushirish va deploy amallari alohida ruxsatsiz bajarilmaydi.",
    "Keyingi hisobot taxminan besh daqiqadan keyin tayyorlanadi."
  ];
  return { id: now.toISOString(), createdAt: now.toISOString(), type: "system-summary", text: lines.join(" "), summary: {
    uptimeSeconds: Math.max(0, Math.floor(snapshot.uptimeSeconds || 0)), modelConfigured: model.configured === true,
    learningRunning: learning.running === true, learningCycles: Number(learning.cycles) || 0,
    learningSaved: Number(learning.saved) || 0, developerEnabled: developer.enabled !== false,
    statusAvailable: !statusUnavailable, imagesConfigured: snapshot.images?.enabled === true,
    videosConfigured: snapshot.videos?.enabled === true, tasks
  }};
}
function createVoiceReportService(options = {}) {
  const dataDir = path.resolve(options.dataDir || process.env.ULUGBEK_DATA_DIR || path.join(__dirname, "..", "data"));
  const file = path.join(dataDir, "voice-reports.json");
  const intervalMs = Math.max(60_000, Number(options.intervalMs) || REPORT_INTERVAL_MS);
  const readSnapshot = typeof options.readSnapshot === "function" ? options.readSnapshot : () => ({});
  let reports = [], timer = null, inFlight = false, lastError = null, started = false;
  async function load() {
    try { const saved = JSON.parse(await fs.readFile(file, "utf8")); reports = Array.isArray(saved) ? saved.slice(-MAX_REPORTS) : []; }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  async function persist() {
    await fs.mkdir(dataDir, { recursive: true });
    const temp = file + ".tmp";
    await fs.writeFile(temp, JSON.stringify(reports.slice(-MAX_REPORTS), null, 2), { mode: 0o600 });
    await fs.rename(temp, file);
  }
  async function generate() {
    if (inFlight) return reports[0] || null;
    inFlight = true;
    try {
      const snapshot = safeStatus(readSnapshot);
      const report = buildReport({ ...snapshot, tasks: countTasks(snapshot.tasks) });
      reports = [report, ...reports.filter(item => item?.id !== report.id)].slice(0, MAX_REPORTS);
      await persist(); lastError = null; return report;
    } catch (_) { lastError = "report_storage_or_generation_failed"; return null; }
    finally { inFlight = false; }
  }
  async function start() {
    if (started) return status();
    await load(); started = true; await generate();
    timer = setInterval(() => { void generate(); }, intervalMs); timer.unref?.();
    return status();
  }
  function stop() { if (timer) clearInterval(timer); timer = null; started = false; }
  function latest() { return reports[0] || null; }
  function history(limit = 10) { return reports.slice(0, Math.min(20, Math.max(1, Number(limit) || 10))); }
  function status() { return { enabled: true, started, intervalMs, intervalMinutes: intervalMs / 60000, reportCount: reports.length, lastReportAt: latest()?.createdAt || null, lastError }; }
  return { start, stop, generate, latest, history, status, buildReport };
}
module.exports = { createVoiceReportService, buildReport, countTasks, REPORT_INTERVAL_MS };
