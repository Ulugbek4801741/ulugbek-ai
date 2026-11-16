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

function selectAnswer(primary, localCandidate, question) {
  const hasQuestion = Boolean(String(question || "").trim());
  const candidates = [primary, localCandidate].filter(isAnswerable);
  for (const candidate of candidates) {
    if (!hasQuestion || isTopicallyRelevant(question, candidate)) return candidate;
  }
  // If a question was supplied, never promote an answer that failed the topic gate.
  return hasQuestion ? null : (primary || localCandidate || null);
}

module.exports = { isAnswerable, isTopicallyRelevant, selectAnswer };
