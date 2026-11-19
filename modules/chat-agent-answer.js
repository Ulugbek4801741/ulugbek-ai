"use strict";

function extractOriginalTask(prompt) {
  const value = String(prompt || "").trim();
  const match = value.match(/Foydalanuvchi topshirig'i:\\s*([\\s\\S]*)$/i);
  return (match ? match[1] : value).trim().slice(0, 4000);
}

function createChatAgentAnswer(options = {}) {
  const singleAgent = options.singleAgent;
  const loadNativeBrain = typeof options.loadNativeBrain === "function"
    ? options.loadNativeBrain
    : () => require("../lab-learning-worker");

  return async function answerForChat(prompt, entries = [], context = null) {
    if (singleAgent && typeof singleAgent.answer === "function") {
      try {
        const hosted = await singleAgent.answer(prompt, entries, context);
        if (hosted && typeof hosted.reply === "string" && hosted.reply.trim()) return hosted;
      } catch (_) {
        // A hosted model outage must not prevent the native fallback from answering.
      }
    }

    const task = extractOriginalTask(prompt);
    if (!task) return null;
    try {
      const nativeBrain = loadNativeBrain();
      if (!nativeBrain || typeof nativeBrain.buildLocalReply !== "function") return null;
      const local = nativeBrain.buildLocalReply(task, Array.isArray(entries) ? entries : [], context);
      return local && local.reasoning && local.reasoning.answerable === true &&
        typeof local.reply === "string" && local.reply.trim() ? local : null;
    } catch (_) {
      return null;
    }
  };
}

module.exports = { extractOriginalTask, createChatAgentAnswer };
