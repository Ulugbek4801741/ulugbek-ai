"use strict";

// Internet-only chat pipeline: no model provider, no local knowledge store,
// no research cache, and no background-learning corpus are queried or written.
const universalSearch = require("./universal-web-search");
const webSearch = require("./chat-web-research");
const nativeCognition = require("../native-cognition");

function compactFacts(facts, maxFacts = 2) {
  const selected = [];
  const seen = new Set();
  for (const item of Array.isArray(facts) ? facts : []) {
    const fact = String(item?.fact || "").replace(/^\s*\d+[.)]\s*/, "").replace(/\s+/g, " ").trim();
    if (fact.length < 25) continue;
    const key = fact.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(fact.length > 420 ? fact.slice(0, 417).replace(/\s+\S*$/, "") + "..." : fact);
    if (selected.length >= maxFacts) break;
  }
  return selected;
}

async function answer(question, context, options = {}) {
  const query = String(question || "").trim();
  if (!query) return { reply: "Savol matni bo‘sh.", answerable: false, webSearchUsed: false };

  const intent = universalSearch.detectSearchIntent(query);
  if (!intent.shouldSearch) {
    const math = require("./math-engine").findExpression(query);
    if (math) {
      const value = require("./math-engine").formatNumber(math.result);
      return { reply: "Hisoblash: " + math.expression + " = " + value + ". Javob: " + value + ".", answerable: true, webSearchUsed: false, method: "native-arithmetic" };
    }
    if (/^(salom|assalomu alaykum|assalom alaykum|hello|hi|rahmat|katta rahmat|tashakkur)[!. ]*$/iu.test(query)) {
      return { reply: /rahmat|tashakkur/iu.test(query) ? "Arzimaydi! Yana qanday savolingiz bor?" : "Va alaykum assalom! Savolingizni yozing — kerakli ma’lumotni internetdan tekshiraman.", answerable: true, webSearchUsed: false, method: "simple-greeting" };
    }
  }

  if (intent.isJobSearch) {
    const jobSearch = require("./job-search");
    if (!jobSearch.hasLocationHint(query)) {
      return { reply: jobSearch.locationClarification(), answerable: false, webSearchUsed: false, method: "job-search-needs-location" };
    }
    const jobs = await jobSearch.searchJobs(query, options.webSearch || webSearch);
    return { reply: jobs.reply, answerable: Boolean(jobs.results?.length), webSearchUsed: Boolean(jobs.ok), method: "public-job-feeds", details: { count: jobs.results?.length || 0 }, jobResults: jobs.results || [] };
  }

  let found;
  let legalMetadata = null;
  if (options.legalResearch === true) {
    const legalResearch = require("./legal-research");
    const legal = await legalResearch.research(query, options.countryCode || "", options.webSearch || webSearch, { limit: 6 });
    legalMetadata = { jurisdiction: legal.jurisdiction, officialSourcesFound: legal.results.length, officialPagesRead: legal.results.filter(item => item.pageRead).length };
    if (!legal.results.length || !legal.results.some(item => item.pageRead)) {
      return { reply: legalResearch.noEvidenceReply(legal.jurisdiction), answerable: false, webSearchUsed: true, method: "legal-official-source-not-confirmed", legal: legalMetadata, sources: legal.results || [], sourceRecords: legal.results || [] };
    }
    found = { ok: true, results: legal.results.map(item => ({ ...item, url: item.source, snippet: item.content })) };
  } else {
    try {
      found = await (options.searchWeb || universalSearch.searchWeb)(
        query,
        options.webSearch || webSearch,
        { limit: 8, includeScholarly: true }
      );
    } catch (_) {
      return { reply: "Internet qidiruvi hozircha ishlamadi. Birozdan keyin qayta urinib ko‘ring.", answerable: false, webSearchUsed: false, method: "web-search-error" };
    }
  }

  // Search snippets alone are not treated as evidence. Only successfully opened public pages may support an answer.
  const verifiedResults = (found.results || []).filter(item => item && item.pageRead === true);
  const evidence = universalSearch.evidenceEntries(verifiedResults);
  if (!found.ok || !evidence.length) {
    return {
      reply: "Savolingiz bo‘yicha internetdan hozircha bevosita mos va o‘qilgan ishonchli manba topilmadi. Tasdiqlanmagan ma’lumotni taxmin qilib bermayman.",
      answerable: false, webSearchUsed: Boolean(found.ok), method: "web-evidence-unavailable",
      sourceCount: 0,
      legal: legalMetadata
    };
  }

  // Deterministic fact extraction/ranking only. No generative model is called.
  const reasoning = (options.reason || nativeCognition.reason)(query, evidence);
  const facts = compactFacts(reasoning.facts, 2);
  if (!reasoning.answerable || !facts.length) {
    return {
      reply: "Internet manbalari topildi, ammo ularning matnidan savolingizga bevosita javob bo‘ladigan dalil ajratilmadi. Noto‘g‘ri xulosa bermaslik uchun javobni tasdiqlangan deb ko‘rsatmayman.",
      answerable: false, webSearchUsed: true, method: "web-evidence-not-sufficient",
      sourceCount: verifiedResults.length,
      legal: legalMetadata
    };
  }

  return {
    reply: facts.join(" "),
    answerable: true,
    webSearchUsed: true,
    method: "single-web-evidence-answer-no-model",
    sourceCount: verifiedResults.length,
    readPageCount: verifiedResults.length,
    sources: verifiedResults.slice(0, 5).map(item => ({ title: item.title, url: item.url })),
    sourceRecords: verifiedResults,
    legal: legalMetadata
  };
}

module.exports = { answer, compactFacts };
