"use strict";

const sessions = new Map();
const MAX_SESSIONS = 500;
const TTL_MS = 30 * 60 * 1000;
const JOB_INTENT = /(?:\bish\s*(?:top(?:ib)?\s*ber|qidir(?:ib)?\s*ber|kerak|o\s*rin|vakans)|\bjob\s*(?:search|opening)|\bваканси|\bработ)/iu;
const LOCATION_ONLY = /^(?:kogon|buxoro|buxoro shahri|buxoroda|kogonda|toshkent|toshkentda|samarqand|samarqandda|navoiy|navoiyda|qarshi|qarshida|andijon|andijonda|farg'ona|farg'onada|namangan|namanganda|nukus|nukusda|urganch|urganchda|jizzax|jizzaxda|termiz|termizda|olot|g'ijduvon)(?:\s+(?:shahri|tumani))?$/iu;

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
  if (previous && LOCATION_ONLY.test(text) && JOB_INTENT.test(previous.lastPrompt)) {
    return (previous.lastPrompt + " " + text).slice(0, 4000);
  }
  return text;
}
function remember(sessionId, prompt) {
  const key = String(sessionId || "").slice(0, 80);
  const text = String(prompt || "").trim().slice(0, 4000);
  if (!key || !text) return;
  prune();
  sessions.delete(key);
  sessions.set(key, { lastPrompt: text, updatedAt: Date.now() });
}
function middleware() {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = payload => {
      const prompt = req.chatContextMessage || req.body?.message || "";
      if (typeof prompt === "string" && prompt.trim()) remember(req.body?.sessionId, prompt);
      return originalJson(payload);
    };
    next();
  };
}
function clear() { sessions.clear(); }

module.exports = { expand, remember, middleware, clear };
