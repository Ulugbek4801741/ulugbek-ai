"use strict";

const sourceRelevance = require("./source-relevance");

function isAnswerable(result) {
  return Boolean(result && result.reasoning?.answerable === true &&
    typeof result.reply === "string" && result.reply.trim());
}

function isTopicallyRelevant(question, result) {
  if (!String(question || "").trim()) return true;
  if (!isAnswerable(result)) return false;
  // Deterministic built-in dialogue replies are matched by intent rules
  // (e.g. language lessons and programming guidance), not factual evidence.
  if (result.reasoning?.method === "built-in-dialogue") return true;
  return sourceRelevance.scoreSource(question, {
    title: "",
    snippet: result.reply
  }).relevant;
}

function extractPopulationNumbers(value) {
  const matches = String(value || "").match(/\b\d{1,3}(?:,\d{3}){2,}\b|\b\d+(?:\.\d+)?\b/g) || [];
  return matches
    .filter(token => !/^20\d{2}$/.test(token.replace(/,/g, "")))
    .map(token => token.replace(/,/g, ""))
    .filter(token => {
      const number = Number(token);
      return Number.isFinite(number) && (number >= 1000 || (number > 1 && number < 100 && token.includes(".")));
    });
}

function isEvidenceBackedPopulationAnswer(result, evidence) {
  if (!isAnswerable(result)) return false;
  const reply = result.reply.toLowerCase();
  if (/(?:2025[- ]?yilga borib|by 2025|2025.{0,50}(?:kutil\w*|expected|projected|forecast|will overtake|will surpass))/iu.test(reply)) return false;
  if (!/(?:aholi|population|inhabitants|residents)/iu.test(reply)) return false;
  const replyNumbers = extractPopulationNumbers(reply);
  if (!replyNumbers.length) return false;
  const evidenceText = (Array.isArray(evidence) ? evidence : [])
    .map(item => [item?.title, item?.content, item?.snippet].filter(Boolean).join(" "))
    .join(" ");
  const evidenceNumbers = new Set(extractPopulationNumbers(evidenceText));
  return replyNumbers.some(number => evidenceNumbers.has(number));
}

function selectAnswer(primary, localCandidate, question, evidence = [], options = {}) {
  const hasQuestion = Boolean(String(question || "").trim());
  const requireEvidenceBackedNumber = options.requireEvidenceBackedNumber === true;
  const candidates = (requireEvidenceBackedNumber ? [primary] : [primary, localCandidate]).filter(isAnswerable);
  for (const candidate of candidates) {
    if (hasQuestion && !isTopicallyRelevant(question, candidate)) continue;
    if (requireEvidenceBackedNumber && !isEvidenceBackedPopulationAnswer(candidate, evidence)) continue;
    return candidate;
  }
  // If a question was supplied, never promote an answer that failed the topic/evidence gate.
  return hasQuestion ? null : (primary || localCandidate || null);
}

module.exports = {
  isAnswerable,
  isTopicallyRelevant,
  extractPopulationNumbers,
  isEvidenceBackedPopulationAnswer,
  selectAnswer
};
