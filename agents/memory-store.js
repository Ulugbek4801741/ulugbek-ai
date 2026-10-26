"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const STORE = path.resolve(process.env.AGENT_MEMORY_PATH || path.join(__dirname, "..", "data", "agent-memory.json"));
const MAX_SESSIONS = 500;
const MAX_TURNS = 8;
let cache = null;
let writeChain = Promise.resolve();

function validSession(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{8,80}$/.test(value) ? value : null;
}
async function load() {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(await fs.readFile(STORE, "utf8"));
    cache = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    if (error.code !== "ENOENT") console.error("Agent memory could not be loaded:", error.message);
    cache = {};
  }
  return cache;
}
async function getMemory(agentId, sessionId) {
  const session = validSession(sessionId);
  if (!session) return [];
  const all = await load();
  const key = session + ":" + String(agentId).replace(/[^a-z0-9_-]/gi, "").slice(0, 64);
  const entry = all[key];
  if (!entry || !Array.isArray(entry.turns)) return [];
  return entry.turns.slice(-MAX_TURNS);
}
async function remember(agentId, sessionId, userText, assistantText) {
  const session = validSession(sessionId);
  if (!session) throw new TypeError("Valid session ID is required for memory storage.");
  const all = await load();
  const agent = String(agentId).replace(/[^a-z0-9_-]/gi, "").slice(0, 64);
  const key = session + ":" + agent;
  const entry = all[key] || { agentId: agent, sessionId: session, updatedAt: null, turns: [] };
  entry.turns.push({
    at: new Date().toISOString(),
    user: String(userText || "").slice(0, 2000),
    assistant: String(assistantText || "").slice(0, 2500)
  });
  entry.turns = entry.turns.slice(-MAX_TURNS);
  entry.updatedAt = new Date().toISOString();
  all[key] = entry;
  const keys = Object.keys(all);
  if (keys.length > MAX_SESSIONS) {
    keys.sort((a, b) => String(all[a].updatedAt || "").localeCompare(String(all[b].updatedAt || "")));
    for (const old of keys.slice(0, keys.length - MAX_SESSIONS)) delete all[old];
  }
  const snapshot = JSON.stringify(all, null, 2);
  writeChain = writeChain.then(async () => {
    await fs.mkdir(path.dirname(STORE), { recursive: true });
    const temp = STORE + "." + crypto.randomUUID() + ".tmp";
    await fs.writeFile(temp, snapshot, { mode: 0o600 });
    await fs.rename(temp, STORE);
  });
  await writeChain;
}
module.exports = { getMemory, remember, validSession, _resetForTests: () => { cache = null; writeChain = Promise.resolve(); } };
