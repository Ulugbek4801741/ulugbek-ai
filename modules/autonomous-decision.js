"use strict";

// Autonomous decision planner with explicit, scoped human approval.
// Planning is independent; execution is never implied by a recommendation.
const RISK = {
  read: 0,
  draft: 1,
  reversible: 2,
  external: 3,
  destructive: 4,
  financial: 4,
  security: 4
};
const HIGH_RISK = new Set(["external", "destructive", "financial", "security"]);

function cleanText(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function createDecision(input = {}) {
  const goal = cleanText(input.goal, 1000);
  const options = Array.isArray(input.options) ? input.options.slice(0, 8) : [];
  const evidence = Array.isArray(input.evidence) ? input.evidence.slice(0, 20) : [];
  const chosen = options.map((rawOption, index) => {
    const option = rawOption && typeof rawOption === "object" && !Array.isArray(rawOption) ? rawOption : {};
    return ({
    id: cleanText(option.id || String(index + 1), 40),
    title: cleanText(option.title, 160),
    benefit: cleanText(option.benefit, 300),
    harm: cleanText(option.harm, 300),
    risk: Object.prototype.hasOwnProperty.call(RISK, option.risk) ? option.risk : "external",
    score: Number.isFinite(option.score) ? Math.max(-100, Math.min(100, option.score)) : 0
    });
  }).sort((a, b) => b.score - a.score);
  const best = chosen[0] || null;
  const risk = best ? best.risk : "external";
  const needsApproval = true;
  return {
    kind: "ulugbek-ai-decision-v1",
    goal,
    selectedOption: best,
    alternatives: chosen.slice(1),
    evidenceCount: evidence.length,
    confidence: evidence.length >= 3 ? "moderate" : evidence.length ? "low" : "unknown",
    reasoning: best
      ? "Variantlar berilgan foyda, zarar, xavf va baholar bo‘yicha tartiblandi. Bu tavsiya, mutlaq haqiqat emas."
      : "Variantlar yoki yetarli ma'lumot berilmagan; avval qo‘shimcha ma'lumot kerak.",
    risk,
    needsApproval,
    approvalScope: best ? { optionId: best.id, goal } : null,
    status: "awaiting_user_approval",
    executionAllowed: false,
    safeguards: [
      "Faqat tasdiqlangan vazifa bajariladi",
      "Tasdiq boshqa vazifa yoki keyingi amallarga avtomatik tatbiq etilmaydi",
      "Pul, tashqi xabar, ma'lumotni o‘chirish va xavfsizlik sozlamalari uchun aniq alohida tasdiq kerak",
      "Ruxsat bo‘lmasa bajarish bloklanadi"
    ]
  };
}

function approveDecision(decision, approval = {}) {
  if (!decision || decision.kind !== "ulugbek-ai-decision-v1") {
    return { allowed: false, reason: "Noto‘g‘ri qaror obyekti." };
  }
  const expected = decision.approvalScope;
  const exact = approval.confirmed === true &&
    expected &&
    cleanText(approval.optionId, 40) === expected.optionId &&
    cleanText(approval.goal, 1000) === expected.goal;
  if (!exact) return { allowed: false, reason: "Aniq vazifa tasdiqlanmadi." };
  if (!decision.selectedOption) return { allowed: false, reason: "Bajarish uchun tanlangan variant yo‘q." };
  return {
    allowed: true,
    optionId: expected.optionId,
    goal: expected.goal,
    risk: decision.risk,
    requiresActionSpecificChecks: HIGH_RISK.has(decision.risk),
    note: "Faqat shu vazifa doirasidagi ruxsat; boshqa amallarga ruxsat bermaydi."
  };
}

module.exports = { createDecision, approveDecision, RISK };
