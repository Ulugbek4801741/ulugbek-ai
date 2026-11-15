"use strict";

// Independent, provider-free Q&A over ULUGBEK's locally approved knowledge.
// No network requests, hosted model calls, embeddings API, or conversation persistence.
function createIndependentModel(options = {}) {
  const knowledge = options.knowledge || require("../lab-learning-worker");
  const cognition = options.cognition || require("../native-cognition");

  async function answer(input) {
    const query = typeof input === "string" ? input.trim() : "";
    if (!query) {
      const error = new Error("Savol bo‘sh bo‘lmasin.");
      error.statusCode = 400;
      throw error;
    }
    if (query.length > 4000) {
      const error = new Error("Savol 4000 belgidan oshmasin.");
      error.statusCode = 413;
      throw error;
    }
    const approved = await knowledge.searchKnowledge(query, 8);
    const safeEntries = approved.filter(item =>
      item && item.status === "approved" && typeof item.content === "string" &&
      typeof item.source === "string" && item.source.startsWith("https://")
    );
    const result = cognition.respond(query, safeEntries);
    return {
      ok: true,
      mode: "independent-local-knowledge-and-symbolic-reasoning",
      provider: "none",
      externalModelCalled: false,
      conversationSaved: false,
      reply: result.reply,
      answerable: result.reasoning?.answerable === true,
      reasoning: result.reasoning,
      knowledgeUsed: safeEntries.length,
      sources: [...new Map(safeEntries.map(item => [item.source, {
        title: item.title || "Nomsiz manba",
        url: item.source,
        language: item.language || "unknown"
      }])).values()]
    };
  }

  function status() {
    const language = require("../modules/language-cognition").status();
    return {
      ready: true,
      name: "ULUGBEK Independent Knowledge Model",
      mode: "local-approved-retrieval-plus-symbolic-reasoning",
      provider: "none",
      externalModelRequired: false,
      externalNetworkUsedForAnswers: false,
      conversationPersistence: false,
      knowledgeTraining: language,
      limitation: "Bu hali katta neyron ChatGPT modeli emas; tasdiqlangan mahalliy bilim va ramziy mantiqdan foydalanadi."
    };
  }

  return { answer, status };
}

module.exports = { createIndependentModel };
