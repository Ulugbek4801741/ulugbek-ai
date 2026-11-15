"use strict";

function isAnswerable(result) {
  return Boolean(result && result.reasoning?.answerable === true &&
    typeof result.reply === "string" && result.reply.trim());
}

function selectAnswer(primary, localCandidate) {
  if (isAnswerable(primary)) return primary;
  if (isAnswerable(localCandidate)) return localCandidate;
  return primary || localCandidate || null;
}

module.exports = { isAnswerable, selectAnswer };
