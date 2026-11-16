"use strict";

const webResearch = require("./chat-web-research");

function hostOf(value) {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); }
  catch (_) { return ""; }
}

async function compareSources(query, options = {}) {
  const question = String(query || "").trim().slice(0, 500);
  if (question.length < 3) throw Object.assign(new Error("Tekshiriladigan savol kamida 3 belgidan iborat bo‘lishi kerak."), { statusCode: 400 });
  const search = options.search || webResearch.search;
  const read = options.read || webResearch.fetchPage;
  const candidates = await search(question);
  const selected = [];
  const domains = new Set();
  for (const item of Array.isArray(candidates) ? candidates : []) {
    const host = hostOf(item.url);
    if (!host || domains.has(host)) continue;
    domains.add(host);
    selected.push({ ...item, host });
    if (selected.length >= 6) break;
  }
  const pages = await Promise.all(selected.map(async item => {
    try {
      const page = await read(item.url);
      if (!page || !page.content || String(page.content).trim().length < 100) {
        return { title: item.title, url: item.url, host: item.host, pageRead: false, reason: "Sahifa to‘liq o‘qilmadi." };
      }
      return {
        title: String(page.title || item.title).slice(0, 220),
        url: item.url, host: item.host, pageRead: true,
        excerpt: String(page.content).replace(/\s+/g, " ").trim().slice(0, 2600)
      };
    } catch (_) {
      return { title: item.title, url: item.url, host: item.host, pageRead: false, reason: "Sahifaga kirish cheklangan yoki vaqt tugadi." };
    }
  }));
  const readable = pages.filter(item => item.pageRead);
  return {
    ok: true, query: question, searchedAt: new Date().toISOString(),
    sourceCount: readable.length,
    distinctDomains: [...new Set(readable.map(item => item.host))].length,
    sources: pages,
    verification: {
      method: "cross-domain-public-page-comparison",
      verifiedFacts: 0,
      status: readable.length >= 2 ? "evidence-collected-needs-claim-level-comparison" : "insufficient-domain-diverse-evidence",
      note: "Turli domenlardan sahifalar yig‘ildi; domenlar turlicha bo‘lishi manbalar tahririy jihatdan mustaqil degani emas. Bu avtomatik fakt tasdig‘i emas."
    }
  };
}

module.exports = { hostOf, compareSources };
