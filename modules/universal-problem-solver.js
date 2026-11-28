"use strict";

const MAX_STEPS = 12;
const MAX_ITERATIONS = 3;
const HIGH_IMPACT_ACTIONS = new Set([
  "deploy_production", "restart_server", "change_secret", "change_permissions",
  "charge_payment", "delete_data", "migrate_data", "send_external_message"
]);

function cleanText(value, name, max = 4000) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(name + " must be a non-empty string");
  return value.trim().slice(0, max);
}

function createUniversalProblemSolver(options = {}) {
  const handlers = options.handlers || {};
  const maxIterations = Math.min(Math.max(Number(options.maxIterations) || MAX_ITERATIONS, 1), MAX_ITERATIONS);

  function plan(task, context = {}) {
    const normalized = cleanText(task, "task");
    const category = context.category || "general";
    return {
      task: normalized,
      category,
      createdAt: new Date().toISOString(),
      steps: [
        { id: "diagnose", title: "Muammoni aniqlash", status: "pending" },
        { id: "research", title: "Kerakli manbalarni izlash", status: "pending" },
        { id: "design", title: "Yechim va reja tuzish", status: "pending" },
        { id: "execute", title: "Ruxsat doirasida bajarish", status: "pending" },
        { id: "test", title: "Natijani tekshirish", status: "pending" },
        { id: "iterate", title: "Xatolarni tuzatish", status: "pending" },
        { id: "deliver", title: "Natijani topshirish", status: "pending" }
      ],
      safety: { approvalRequiredForHighImpact: true, highImpactActions: [...HIGH_IMPACT_ACTIONS] }
    };
  }

  async function solve(task, context = {}) {
    const workflow = plan(task, context);
    const history = [];
    const notes = [];
    const maxRounds = Math.min(Math.max(Number(context.maxIterations) || maxIterations, 1), MAX_ITERATIONS);
    let finalResult = null;
    let halted = false;

    for (const step of workflow.steps) {
      step.status = "running";
      if (step.id === "execute" && context.action && HIGH_IMPACT_ACTIONS.has(context.action) && context.approved !== true) {
        step.status = "blocked";
        step.reason = "Yuqori ta'sirli amal uchun foydalanuvchi tasdig'i talab qilinadi.";
        halted = true;
        break;
      }
      const handler = handlers[step.id];
      if (typeof handler !== "function") {
        step.status = step.id === "execute" ? "skipped" : "completed";
        if (step.id === "execute") notes.push("Bajaruvchi adapter sozlanmagan; tashqi amallar bajarilmadi.");
        continue;
      }
      try {
        const input = { task: workflow.task, context, workflow, history, notes, step };
        if (step.id === "iterate") {
          let result = { ok: false, skipped: true, reason: "Test natijasi yoki tuzatish adapteri mavjud emas." };
          for (let round = 1; round <= maxRounds; round++) {
            const roundResult = await handler({ ...input, round, previous: finalResult });
            history.push({ step: step.id, round, result: roundResult });
            finalResult = roundResult;
            if (roundResult && roundResult.ok === true) { result = roundResult; break; }
          }
          step.status = result.ok === true ? "completed" : "needs_review";
          step.result = result;
          continue;
        }
        const result = await handler(input);
        history.push({ step: step.id, result });
        if (result && typeof result === "object" && Array.isArray(result.notes)) notes.push(...result.notes);
        if (step.id === "test") finalResult = result;
        step.status = result && result.ok === false ? "needs_review" : "completed";
        step.result = result;
      } catch (error) {
        step.status = "failed";
        step.error = String(error && error.message || "Step failed").slice(0, 300);
        halted = true;
        break;
      }
    }
    return {
      ok: !halted && workflow.steps.every(s => ["completed", "skipped"].includes(s.status)),
      task: workflow.task,
      workflow,
      history,
      notes,
      finalResult,
      blocked: halted,
      limitations: ["Tashqi internet, fayl yozish, deploy va boshqa real amallar faqat tegishli adapter hamda ruxsat bo‘lsa ishlaydi."]
    };
  }

  return { plan, solve, status: () => ({ ready: true, maxIterations, handlers: Object.keys(handlers) }) };
}

module.exports = { createUniversalProblemSolver, HIGH_IMPACT_ACTIONS: [...HIGH_IMPACT_ACTIONS] };
