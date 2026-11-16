"use strict";

const sessions = new Map();
const MAX_SESSIONS = 500;
const TTL_MS = 30 * 60 * 1000;
const JOB_INTENT = /(?:\bish\w*\s*(?:top(?:ib)?(?:\s*ber)?|qidir(?:ib)?(?:\s*ber)?|kerak|o\s*rin|vakans)|\bvakans(?:iya|iyalar)?|\bjob\s*(?:search|opening)|\bваканси|\bработ)/iu;
const LOCATION_ONLY = /^(?:kogon|buxoro|buxoro shahri|buxoroda|kogonda|toshkent|toshkentda|samarqand|samarqandda|navoiy|navoiyda|qarshi|qarshida|andijon|andijonda|farg'ona|farg'onada|namangan|namanganda|nukus|nukusda|urganch|urganchda|jizzax|jizzaxda|termiz|termizda|olot|g'ijduvon|dunyo\s*bo['’‘ʻʼ]?ylab|butun\s*dunyo|worldwide|global(?:ly)?|international(?:ly)?)(?:\s+(?:shahri|tumani))?$/iu;
const KNOWN_LOCATIONS = /\b(kogon|buxoro|toshkent|samarqand|navoiy|qarshi|andijon|farg'ona|namangan|nukus|urganch|jizzax|termiz|guliston|denov|olot|g'ijduvon)(?:da|ga|dan|ning|ni)?\b/iu;
const SOURCE_REQUEST = /(?:\bmanba(?:lar|si|dan|ga|ni|ning)?\b|\bqaysi\s+manba\b|\bmanba.{0,35}(?:havola|url|manzil)\b|\bqayerdan\s+(?:old|ol|olgan|foydalan|o['’]?q|o['’]?rgangan)\w*|\bsource(?:s)?\b|\bcitation(?:s)?\b|\bwhere\s+did\s+you\s+get\b)/iu;
const FOLLOW_UP_JOB = /(?:^(?:ish(?:\s+(?:topib\s+ber|qidirib\s+ber|kerak))?|\bish\s+top|vakansiya(?:\s+topib\s+ber)?|job(?:\s+search)?|yana\s+qidir|davom\s+et)[!.?\s]*$|\bshu\s+(?:yo['’]?nalish(?:da|ga)?|soha|kasb)\b|\bmen\s+.{0,45}\b(?:dasturchi|dasturlovchi|programmist|programmer|developer|frontend|backend|android\s+dasturchi)\w*|\b(?:dasturchiman|dasturlovchiman)\b)/iu;

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
  const previousWasJobSearch = JOB_INTENT.test(previous.lastPrompt);
  if (LOCATION_ONLY.test(text) && previousWasJobSearch) {
    return (previous.lastPrompt + " " + text).slice(0, 4000);
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
  sessions.set(key, { lastPrompt: text, sources: existing?.sources || [], updatedAt: Date.now() });
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

function clear() { sessions.clear(); }

module.exports = { expand, remember, rememberSources, getSources, isSourceRequest, middleware, clear, JOB_INTENT, KNOWN_LOCATIONS };
