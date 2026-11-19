"use strict";

const sessions = new Map();
const MAX_SESSIONS = 500;
const TTL_MS = 30 * 60 * 1000;
const JOB_INTENT = /(?:\bish\w*\s*(?:top(?:ib)?(?:\s*ber)?|qidir(?:ib)?(?:\s*ber)?|kerak|o\s*rin|vakans)|\bvakans(?:iya|iyalar)?|\bjob\s*(?:search|opening)|\bваканси|\bработ)/iu;
const LOCATION_ONLY = /^(?:(?:kogon|buxoro|toshkent|samarqand|navoiy|qarshi|andijon|farg'ona|namangan|nukus|urganch|jizzax|termiz|olot|g'ijduvon)(?:da|ga|dan|ning|ni)?|buxoro\\s+shahri|dunyo\\s*bo['’‘ʻʼ]?ylab|butun\\s*dunyo|worldwide|global(?:ly)?|international(?:ly)?)(?:\\s+(?:shahri|tumani))?$/iu;
const KNOWN_LOCATIONS = /\b(kogon|buxoro|toshkent|samarqand|navoiy|qarshi|andijon|farg'ona|namangan|nukus|urganch|jizzax|termiz|guliston|denov|olot|g'ijduvon)(?:da|ga|dan|ning|ni)?\b/iu;
const SOURCE_REQUEST = /(?:\bmanba(?:lar|si|dan|ga|ni|ning)?\b|\bqaysi\s+manba\b|\bmanba.{0,35}(?:havola|url|manzil)\b|\bqayerdan\s+(?:old|ol|olgan|foydalan|o['’]?q|o['’]?rgangan)\w*|\bsource(?:s)?\b|\bcitation(?:s)?\b|\bwhere\s+did\s+you\s+get\b)/iu;
const FOLLOW_UP_JOB = /(?:^(?:ish(?:\s+(?:topib\s+ber|qidirib\s+ber|kerak))?|\bish\s+top|vakansiya(?:\s+topib\s+ber)?|job(?:\s+search)?|yana\s+qidir|davom\s+et)[!.?\s]*$|\bshu\s+(?:yo['’]?nalish(?:da|ga)?|soha|kasb)\b|\bmen\s+.{0,45}\b(?:dasturchi|dasturlovchi|programmist|programmer|developer|frontend|backend|android\s+dasturchi)\w*|\b(?:dasturchiman|dasturlovchiman)\b)/iu;
const FOLLOW_UP_JOB_DETAILS = /(?:telefon|raqam|telegram|tg|email|e-mail|pochta|aloqa|bog['’ʻ]lan|maosh|oylik|ish haqi|salary|contact|qisqacha|qisqa qilib)/iu;

function prune(now = Date.now()) {
  for (const [key, value] of sessions) {
    if (now - value.updatedAt > TTL_MS) sessions.delete(key);
  }
  while (sessions.size > MAX_SESSIONS) sessions.delete(sessions.keys().next().value);
}
function expand(sessionId, message) {
  const text = String(message || "").trim();
  const key = String(sessionId || "").slice(0, 80);
  if (!key || !text) return text;
  prune();
  const previous = sessions.get(key);
  if (!previous) return text;
  const previousWasJobSearch = JOB_INTENT.test(previous.lastJobSearchPrompt || previous.lastPrompt);
  if (previousWasJobSearch && previous.jobResults?.length && FOLLOW_UP_JOB_DETAILS.test(text)) return previous.lastJobSearchPrompt || previous.lastPrompt;
  if (LOCATION_ONLY.test(text) && previousWasJobSearch) {
    // Keep the original job title/filters even after an intervening follow-up.
    const basePrompt = previous.lastJobSearchPrompt || previous.lastPrompt;
    return (basePrompt + " " + text).slice(0, 4000);
  }
  // Preserve the earlier city when a user clarifies their profession naturally.
  if (previousWasJobSearch && FOLLOW_UP_JOB.test(text) && !KNOWN_LOCATIONS.test(text)) {
    return (previous.lastPrompt + " " + text).slice(0, 4000);
  }
  if (previousWasJobSearch && JOB_INTENT.test(text) && !KNOWN_LOCATIONS.test(text)) {
    const location = previous.lastPrompt.match(KNOWN_LOCATIONS);
    if (location) return (previous.lastPrompt + " " + text).slice(0, 4000);
  }
  return text;
}
function remember(sessionId, prompt) {
  const key = String(sessionId || "").slice(0, 80);
  const text = String(prompt || "").trim().slice(0, 4000);
  if (!key || !text) return;
  prune();
  const existing = sessions.get(key);
  sessions.set(key, { ...(existing || {}), lastPrompt: text, sources: existing?.sources || [], updatedAt: Date.now() });
}
function middleware() {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = payload => {
      const prompt = req.chatContextMessage || req.body?.message || "";
      if (typeof prompt === "string" && prompt.trim()) remember(req.chatSessionId || req.body?.sessionId, prompt);
      return originalJson(payload);
    };
    next();
  };
}

function isSourceRequest(message) { return SOURCE_REQUEST.test(String(message || "").trim()); }
function rememberSources(sessionId, prompt, results) {
  const key = String(sessionId || "").slice(0, 80);
  if (!key) return;
  prune();
  const existing = sessions.get(key) || { lastPrompt: String(prompt || "").slice(0, 4000), sources: [] };
  const sources = (Array.isArray(results) ? results : [])
    .filter(item => item && item.pageRead === true && typeof item.url === "string" && item.url.startsWith("https://"))
    .slice(0, 8)
    .map(item => ({
      title: String(item.title || "Ochiq manba").slice(0, 220),
      url: item.url,
      excerpt: String(item.snippet || item.content || "").replace(/\s+/g, " ").trim().slice(0, 1800),
      fetchedAt: new Date().toISOString()
    }));
  sessions.set(key, { ...existing, lastPrompt: String(prompt || existing.lastPrompt || "").slice(0, 4000), sources, updatedAt: Date.now() });
}
function getSources(sessionId) {
  const key = String(sessionId || "").slice(0, 80);
  prune();
  return sessions.get(key)?.sources || [];
}


function isJobDetailsRequest(message) { return FOLLOW_UP_JOB_DETAILS.test(String(message || "").trim()); }
function rememberJobResults(sessionId, prompt, results) {
  const key = String(sessionId || "").slice(0, 80);
  if (!key) return;
  prune();
  const existing = sessions.get(key) || { sources: [] };
  const jobResults = (Array.isArray(results) ? results : []).slice(0, 25).map(item => ({
    title: String(item.title || "").slice(0, 220),
    employer: String(item.company || item.employer || "").slice(0, 180),
    location: String(item.location || "").slice(0, 220),
    salary: String(item.salary || "").slice(0, 180),
    phones: Array.isArray(item.phones) ? item.phones.slice(0, 4) : [],
    emails: Array.isArray(item.emails) ? item.emails.slice(0, 3) : [],
    telegram: Array.isArray(item.telegram) ? item.telegram.slice(0, 4) : [],
    url: String(item.url || "").slice(0, 1000),
    applicationUrl: String(item.applicationUrl || "").slice(0, 1000)
  }));
  sessions.set(key, { ...existing, lastPrompt: String(prompt || "").slice(0, 4000), lastJobSearchPrompt: String(prompt || "").slice(0, 4000), jobResults, updatedAt: Date.now() });
}
function getLastJobResults(sessionId) {
  const key = String(sessionId || "").slice(0, 80);
  prune();
  return sessions.get(key)?.jobResults || [];
}

function clear() { sessions.clear(); }

module.exports = { expand, remember, rememberSources, getSources, rememberJobResults, getLastJobResults, isJobDetailsRequest, isSourceRequest, middleware, clear, JOB_INTENT, KNOWN_LOCATIONS };
