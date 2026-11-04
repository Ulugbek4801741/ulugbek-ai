"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const MAX_PROPOSALS = 200;
const SCAN_INTERVAL_MS = 30 * 60 * 1000;

function safeText(value, max = 240) {
  return String(value || "").replace(/[\r\n\t]+/g, " ").slice(0, max);
}

function makeId(key) {
  return crypto.createHash("sha256").update(String(key)).digest("hex").slice(0, 16);
}

function collectGaps(snapshot = {}) {
  const gaps = [];
  const health = snapshot.health || {};
  const diagnostics = snapshot.diagnostics || {};
  const modules = Array.isArray(snapshot.modules) ? snapshot.modules : [];
  const agents = Array.isArray(snapshot.agents) ? snapshot.agents : [];

  if (health.multiInstanceSafe === false || /not-configured/i.test(diagnostics.productionDatabase || "")) {
    gaps.push({
      key: "production-database",
      title: "Ishlab chiqarish ma’lumotlar bazasini ulash",
      priority: "critical",
      reason: "Server hozir lokal JSON saqlashga tayanadi; ko‘p nusxa va ko‘p foydalanuvchi uchun umumiy tranzaksion baza tasdiqlanmagan.",
      nextStep: "PostgreSQL migratsiyasi, backup/restore va parallel yozish testlarini alohida staging muhitida tayyorlash.",
      acceptance: "Migratsiya, rollback, backup restore va parallel so‘rov testlari muvaffaqiyatli."
    });
  }
  if (health.automaticFailoverReady === false || /not-configured/i.test(diagnostics.automaticFailover || "")) {
    gaps.push({
      key: "availability-failover",
      title: "Server monitoringi va tiklanish mexanizmi",
      priority: "high",
      reason: "Avtomatik failover tayyorligi tasdiqlanmagan.",
      nextStep: "Health monitoring, alert, restart policy va backup server rejasini stagingda sinash.",
      acceptance: "Nosozlik simulyatsiyasida ogohlantirish va tiklanish natijasi logda qayd etiladi."
    });
  }
  if (health.trainedLanguageModelReady === false && health.localModelConfigured === false) {
    gaps.push({
      key: "local-model",
      title: "Mahalliy til modelini sozlash",
      priority: "high",
      reason: "Haqiqiy o‘qitilgan til modeli ulanmagan; hozirgi qoidaviy fallback to‘liq neyron model emas.",
      nextStep: "Mos ochiq modelni alohida serverda tanlash, resurs talabini baholash va maxfiylik testidan o‘tkazish.",
      acceptance: "Model endpoint health-check, Uzbek savol-javob sinovi va tashqi trafik auditi o‘tadi."
    });
  }
  if (health.agentCount === 1) {
    gaps.push({
      key: "agent-orchestration",
      title: "Mutaxassis agentlarni xavfsiz muvofiqlashtirish",
      priority: "high",
      reason: "Hozir chatda bitta universal agent faol; boshqa agentlarning real ish zanjiri yo‘q.",
      nextStep: "Har agentni sandbox, eng kam ruxsat, vaqt/CPU chegarasi va mustaqil tekshiruv bilan alohida yoqish.",
      acceptance: "Agentlar faqat ruxsat etilgan vazifani bajaradi; sandboxdan chiqish va ruxsatsiz tashqi amal testlari bloklanadi."
    });
  }
  if (/disclosure-only/i.test(diagnostics.securityEnforcement || "")) {
    gaps.push({
      key: "security-enforcement",
      title: "Xavfsizlik siyosatini real bajaruvchi nazoratga aylantirish",
      priority: "critical",
      reason: "Siyosat qoidalari e’lon qilinadi, lekin har bir modulda texnik bloklash to‘liq tasdiqlanmagan.",
      nextStep: "Har bir tool chaqirig‘ini yagona permission gate, audit log va deny-by-default tekshiruviga ulash.",
      acceptance: "Ruxsatsiz tashqi yozish, fayl o‘chirish, deploy va to‘lov sinovlari bloklanadi."
    });
  }
  for (const item of modules) {
    if (item && item.id && ["planned", "prototype"].includes(String(item.status))) {
      gaps.push({
        key: "module-" + safeText(item.id, 80),
        title: safeText(item.name || item.id, 120) + " modulini yakunlash",
        priority: item.status === "prototype" ? "medium" : "low",
        reason: safeText(item.purpose || "Modul hali to‘liq integratsiya qilinmagan.", 260),
        nextStep: "Haqiqiy backend/adapterni aniqlash, ruxsat doirasini belgilash va unit/integration/end-to-end test yozish.",
        acceptance: "Modul faqat real ishlash tekshirilgandan keyin active deb belgilanadi; xato holati aniq ko‘rsatiladi."
      });
    }
  }
  if (agents.length > 1 && health.agentCount === 1) {
    gaps.push({
      key: "agent-registry-activation",
      title: "Agentlar katalogi va haqiqiy ish holatini sinxronlash",
      priority: "medium",
      reason: "Kodda bir nechta agent tavsifi bor, lekin chatning faol agent soni bitta.",
      nextStep: "Har agent uchun status, input/output shartnomasi, ruxsat va test natijasini admin panelda ko‘rsatish.",
      acceptance: "Katalogdagi statuslar runtime tekshiruviga mos va noto‘g‘ri active holat bo‘lmaydi."
    });
  }
  return gaps;
}

function createAutonomousImprovementPlanner(options = {}) {
  const dataDir = path.resolve(options.dataDir || path.join(process.cwd(), "data"));
  const filePath = path.join(dataDir, "improvement-proposals.json");
  const readSnapshot = typeof options.readSnapshot === "function" ? options.readSnapshot : () => ({});
  let proposals = [];
  let loaded = false;
  let lastScanAt = null;
  let lastError = null;
  let scanning = false;
  let timer = null;

  async function persist() {
    await fs.mkdir(dataDir, { recursive: true });
    const temp = filePath + ".tmp";
    await fs.writeFile(temp, JSON.stringify({ version: 1, proposals, lastScanAt }, null, 2), { mode: 0o600 });
    await fs.rename(temp, filePath);
  }

  async function load() {
    if (loaded) return;
    loaded = true;
    try {
      const parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
      if (parsed && parsed.version === 1 && Array.isArray(parsed.proposals)) {
        proposals = parsed.proposals.slice(-MAX_PROPOSALS);
        lastScanAt = parsed.lastScanAt || null;
      }
    } catch (error) {
      if (error.code !== "ENOENT") lastError = "proposal_store_unavailable";
    }
  }

  async function scan() {
    if (scanning) return status();
    scanning = true;
    try {
      await load();
      const snapshot = await readSnapshot();
      const gaps = collectGaps(snapshot);
      const now = new Date().toISOString();
      const existing = new Map(proposals.map(item => [item.key, item]));
      for (const gap of gaps) {
        const previous = existing.get(gap.key);
        if (previous) {
          previous.lastSeenAt = now;
          previous.reason = gap.reason;
          previous.nextStep = gap.nextStep;
          previous.acceptance = gap.acceptance;
          continue;
        }
        proposals.push({
          id: makeId(gap.key),
          key: gap.key,
          title: gap.title,
          priority: gap.priority,
          reason: gap.reason,
          nextStep: gap.nextStep,
          acceptance: gap.acceptance,
          status: "pending_approval",
          createdAt: now,
          lastSeenAt: now,
          decisionAt: null,
          decisionBy: null
        });
      }
      proposals = proposals.slice(-MAX_PROPOSALS);
      lastScanAt = now;
      lastError = null;
      await persist();
      return status();
    } catch (_) {
      lastError = "improvement_scan_or_storage_failed";
      return status();
    } finally {
      scanning = false;
    }
  }

  async function decide(id, decision, actor = "admin") {
    await load();
    if (!["approve", "reject"].includes(decision)) throw new Error("Qaror approve yoki reject bo‘lishi kerak.");
    const item = proposals.find(proposal => proposal.id === String(id));
    if (!item) return null;
    if (item.status !== "pending_approval") throw new Error("Taklif avval ko‘rib chiqilgan.");
    item.status = decision === "approve" ? "approved_for_implementation" : "rejected";
    item.decisionAt = new Date().toISOString();
    item.decisionBy = safeText(actor, 80);
    await persist();
    return { ...item };
  }

  function list(options = {}) {
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 50));
    return proposals.slice().reverse().slice(0, limit).map(item => ({ ...item }));
  }

  function status() {
    const counts = { pendingApproval: 0, approvedForImplementation: 0, rejected: 0 };
    for (const item of proposals) {
      if (item.status === "pending_approval") counts.pendingApproval += 1;
      else if (item.status === "approved_for_implementation") counts.approvedForImplementation += 1;
      else if (item.status === "rejected") counts.rejected += 1;
    }
    return {
      enabled: true,
      mode: "autonomous_read_only_gap_detection",
      intervalMinutes: SCAN_INTERVAL_MS / 60000,
      lastScanAt,
      scanning,
      counts,
      lastError,
      executionEnabled: false,
      codeModificationEnabled: false,
      deploymentEnabled: false,
      note: "Tizim kamchiliklarni mustaqil aniqlaydi va taklif tayyorlaydi. Kod yozish, buyruq bajarish, ruxsatni kengaytirish yoki deploy qilish avtomatik yoqilmagan."
    };
  }

  function start() {
    if (timer) return status();
    scan().catch(() => {});
    timer = setInterval(() => { scan().catch(() => {}); }, SCAN_INTERVAL_MS);
    if (typeof timer.unref === "function") timer.unref();
    return status();
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    return status();
  }

  return { scan, decide, list, status, start, stop, load };
}

module.exports = { createAutonomousImprovementPlanner, collectGaps, SCAN_INTERVAL_MS };
