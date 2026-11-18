"use strict";

function safeObject(value, depth = 0) {
  if (depth > 5 || value == null) return value;
  if (Array.isArray(value)) return value.slice(0, 40).map(item => safeObject(item, depth + 1));
  if (typeof value !== "object") {
    if (typeof value === "string") return value.replace(/(Bearer\s+)[A-Za-z0-9._~-]+/gi, "$1[HIDDEN]").slice(0, 1200);
    return value;
  }
  const output = {};
  for (const [key, item] of Object.entries(value).slice(0, 60)) {
    if (/token|secret|password|credential|authorization|cookie|api.?key/i.test(key)) continue;
    output[key] = safeObject(item, depth + 1);
  }
  return output;
}

function createAdminChatService(deps) {
  const required = ["selfRecovery", "functionGuardian", "singleAgent", "conversationOrchestrator",
    "developerAgent", "adminAutopilot", "agentRuntime", "knowledgeStore", "researchCache",
    "learningWorker", "languageModule"];
  for (const key of required) {
    if (!deps || !deps[key]) throw new TypeError("Admin chat dependency missing: " + key);
  }

  async function diagnostics() {
    const recovery = await deps.selfRecovery.run();
    await deps.functionGuardian.load();
    const tasks = deps.agentRuntime.listTasks();
    const [knowledge, research] = await Promise.allSettled([
      deps.knowledgeStore.status(),
      deps.researchCache.status()
    ]);
    const model = deps.singleAgent.status();
    const report = {
      overall: recovery.status,
      recovery: deps.selfRecovery.report(),
      functions: deps.functionGuardian.report(),
      ai: {
        configured: model.configured === true,
        provider: model.provider || "not-configured",
        model: model.model || null,
        apiKeyRequired: model.apiKeyRequired === true,
        tokenConfigured: model.tokenConfigured === true
      },
      language: deps.languageModule.status(),
      developerAgent: deps.developerAgent.status(),
      learningWorker: deps.learningWorker.status(),
      watchdog: deps.adminAutopilot.status(),
      tasks: {
        queued: tasks.filter(item => item.status === "queued").length,
        running: tasks.filter(item => item.status === "running").length,
        completed: tasks.filter(item => item.status === "completed").length,
        failed: tasks.filter(item => item.status === "failed").length
      },
      knowledge: knowledge.status === "fulfilled" ? knowledge.value : { error: "Bilim ombori holatini o‘qib bo‘lmadi." },
      research: research.status === "fulfilled" ? research.value : { error: "Tadqiqot ombori holatini o‘qib bo‘lmadi." }
    };
    const safe = safeObject(report);
    const failed = Number(recovery.failedChecks || 0);
    const passed = Number(recovery.passedChecks || 0);
    const lines = [
      "ULUGBEK AI diagnostikasi yakunlandi.",
      "Umumiy holat: " + String(recovery.status || "noma’lum"),
      "Tekshiruvlar: " + passed + " muvaffaqiyatli, " + failed + " muammoli.",
      "AI modeli: " + (model.configured ? (model.provider + " / " + (model.model || "model nomi yo‘q")) : "ulanmagan; mahalliy fallback ishlatiladi."),
      "Developer Agent: " + (report.developerAgent.enabled ? "faol" : "o‘chiq") + (report.developerAgent.lastError ? " — " + report.developerAgent.lastError : ""),
      "Learning Worker: " + (report.learningWorker.enabled ? "faol" : "o‘chiq") + (report.learningWorker.lastError ? " — " + report.learningWorker.lastError : ""),
      "Watchdog: " + (report.watchdog.quarantined ? "karantinda" : report.watchdog.enabled ? "faol" : "o‘chiq"),
      "Vazifalar: " + report.tasks.queued + " navbatda, " + report.tasks.running + " bajarilmoqda, " + report.tasks.failed + " xato.",
      "Function Guardian: " + report.functions.trackedEvents + " hodisa, " + report.functions.recentErrors + " xato.",
      "Eslatma: bu tekshiruv diagnostika qiladi; kodni o‘zgartirmaydi va production deploy qilmaydi."
    ];
    return { action: "diagnostics", reply: lines.join("\n"), data: safe };
  }

  async function handle(input) {
    const message = typeof input === "string" ? input.trim() : "";
    if (!message || message.length > 4000) {
      const error = new Error("Xabar 1–4000 belgi bo‘lishi kerak.");
      error.status = 400;
      throw error;
    }
    const normalized = message.toLocaleLowerCase("uz-UZ");

    if (/(diagnost|to‘liq tekshir|to'liq tekshir|serverni tekshir|tizimni tekshir|umumiy holat)/i.test(normalized)) {
      return diagnostics();
    }

    if (/(watchdog|agentlar|workerlar).*(tikla|qayta ishga tushir|recovery)|((tikla|qayta ishga tushir).*(watchdog|agentlar|workerlar))/i.test(normalized)) {
      const result = await deps.adminAutopilot.recover();
      return {
        action: "worker_recovery",
        reply: result.quarantined
          ? "Xavfsiz tiklash amalga oshmadi yoki qayta urinish limiti tugagan. Agentlar karantinda qolmoqda."
          : result.enabled
            ? "Cheklangan workerlarni tiklashga urinish bajarildi. Holatni diagnostika buyrug‘i bilan qayta tekshiring."
            : "Watchdog karantinda emas yoki tiklash talab qilinmaydi. Hech qanday kod yoki server sozlamasi o‘zgartirilmadi.",
        data: safeObject(result)
      };
    }

    if (/(developer agent|github|repozit|repository).*(audit|tekshir|skaner|scan)|((audit|skaner|scan).*(developer|github|repozit))/i.test(normalized)) {
      const result = await deps.developerAgent.auditOnce();
      return {
        action: "repository_audit",
        reply: "GitHub repozitoriy auditi bajarildi. Bu faqat o‘qish va taklif tayyorlash amali; kodga yozish, merge va deploy bajarilmadi. Holat: " +
          (result.lastError ? "xato — " + result.lastError : "tekshiruv tugadi") +
          ". Tekshirilgan fayllar: " + (result.scannedFiles || 0) + ". Admin ko‘rigidagi takliflar: " + (result.pendingApprovals || 0) + ".",
        data: safeObject(result)
      };
    }

    if (/(vazifalar|topshiriqlar|navbatdagi ishlar|task list)/i.test(normalized)) {
      const tasks = deps.agentRuntime.listTasks();
      return {
        action: "task_list",
        reply: "Topshiriqlar: " + tasks.length + " ta. Navbatda: " + tasks.filter(x => x.status === "queued").length +
          ", bajarilmoqda: " + tasks.filter(x => x.status === "running").length +
          ", tugagan: " + tasks.filter(x => x.status === "completed").length +
          ", xato: " + tasks.filter(x => x.status === "failed").length + ".",
        data: safeObject(tasks)
      };
    }

    if (/(ai modeli|model holati|ai holati|modelni tekshir)/i.test(normalized)) {
      const model = deps.singleAgent.status();
      return {
        action: "ai_status",
        reply: model.configured
          ? "AI provayder sozlangan: " + model.provider + ". Model: " + (model.model || "ko‘rsatilmagan") + "."
          : "Tashqi AI modeli ulanmagan. ULUGBEK AI mahalliy fallback imkoniyatlaridan foydalanadi. Serverga maxfiy kalitni chatga yubormang; Render Environment orqali sozlang.",
        data: safeObject({ configured: model.configured, provider: model.provider, model: model.model, apiKeyRequired: model.apiKeyRequired, tokenConfigured: model.tokenConfigured })
      };
    }

    if (/^(yordam|help|buyruqlar|nima qila olasan)[!? .]*$/i.test(normalized)) {
      return {
        action: "help",
        reply: "Men ULUGBEK AI serverining himoyalangan admin chatiman. Hozir quyidagilarni bajara olaman:\n• “To‘liq diagnostika qil” — ichki modullar, workerlar, AI va xotira holati.\n• “Developer Agent GitHub audit qil” — repozitoriyni faqat o‘qib tekshirish.\n• “Workerlarni tiklashga urin” — faqat karantindagi cheklangan workerlarni tiklash.\n• “Vazifalarni ko‘rsat” — navbat va natijalar.\n• “AI model holati” — model konfiguratsiyasi.\nRender xizmatini o‘chirish, maxfiy kalitlarni ko‘rish, asosiy branchga yozish yoki production deploy bu chatda hozircha ochilmagan.",
        data: { actions: ["diagnostics", "repository_audit", "worker_recovery", "task_list", "ai_status"] }
      };
    }

    const context = deps.conversationOrchestrator.analyze(message);
    const prompt = [
      "Siz ULUGBEK AI ning himoyalangan administrator chat yordamchisisiz.",
      "O‘zbek tilida sodda va aniq javob bering.",
      "Sizda faqat diagnostika, GitHub read-only audit, cheklangan worker recovery, task ro‘yxati va AI status amallari mavjud.",
      "Siz Render API orqali xizmat sozlamalarini o‘zgartira olmaysiz, maxfiy kalitlarni ko‘ra olmaysiz, shell buyruqlarini bajara olmaysiz, main branchga yozolmaysiz va deploy qila olmaysiz.",
      "Hech qachon bajarilmagan amalni bajarildi demang. Boshqaruv buyrug‘i yuqoridagi ruxsatli amallardan biri bo‘lmasa, qaysi amal hozircha mavjud emasligini tushuntiring.",
      "Administrator xabari: " + message
    ].join("\n");
    const answer = await deps.singleAgent.answer(prompt, [], context);
    return {
      action: "chat",
      reply: answer && answer.reply
        ? answer.reply
        : "Buyruqni tushundim, lekin bu amal uchun boshqaruv adapteri hali ulanmagan. “Yordam” deb yozing yoki “To‘liq diagnostika qil” buyrug‘ini yuboring.",
      data: { modelConfigured: deps.singleAgent.status().configured, externalActionPerformed: false }
    };
  }

  return { handle, diagnostics };
}

module.exports = { createAdminChatService, safeObject };
