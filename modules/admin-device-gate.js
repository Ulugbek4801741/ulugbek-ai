"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

function createAdminDeviceGate(options = {}) {
  const storePath = options.storePath ? path.resolve(options.storePath) : null;
  const phrase = String(options.activationPhrase ?? process.env.ADMIN_ACTIVATION_PHRASE ?? "");
  const now = options.now || Date.now;
  const enrollmentDelayMs = 24 * 60 * 60 * 1000;
  const maxWrong = 5;
  let state = { version: 1, devices: {}, pending: {}, lastLogoutAt: 0 };
  let loaded = false;
  let queue = Promise.resolve();

  const digest = value => crypto.createHash("sha256").update(String(value)).digest("hex");
  function samePhrase(candidate) {
    const a = crypto.createHash("sha256").update(String(candidate)).digest();
    const b = crypto.createHash("sha256").update(phrase).digest();
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  async function load() {
    if (loaded) return;
    loaded = true;
    if (!storePath) return;
    try {
      const saved = JSON.parse(await fs.readFile(storePath, "utf8"));
      if (saved && saved.version === 1 && saved.devices && saved.pending) state = saved;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  async function persist() {
    if (!storePath) return;
    const snapshot = JSON.stringify(state, null, 2);
    queue = queue.then(async () => {
      await fs.mkdir(path.dirname(storePath), { recursive: true });
      const temp = storePath + ".tmp";
      await fs.writeFile(temp, snapshot, { mode: 0o600 });
      await fs.rename(temp, storePath);
    });
    await queue;
  }
  function deviceId(token) {
    return typeof token === "string" && token.length >= 32 && token.length <= 256 ? digest(token) : "";
  }
  async function isTrusted(token) {
    await load();
    const id = deviceId(token);
    return Boolean(id && state.devices[id]);
  }
  async function canEnroll(token) {
    await load();
    if (await isTrusted(token)) return true;
    return Object.keys(state.devices).length === 0 ||
      (state.lastLogoutAt > 0 && now() - state.lastLogoutAt >= enrollmentDelayMs);
  }
  async function step({ token, phrase: candidate, identifier } = {}) {
    await load();
    if (phrase.length < 12) return { ok: false, status: 503, error: "ADMIN_ACTIVATION_PHRASE serverda kamida 12 belgidan iborat qilib sozlanishi kerak." };
    if (!(await canEnroll(token))) {
      return { ok: false, status: 403, error: "Yangi qurilma ro‘yxatga olinishi uchun oxirgi admin chiqishidan 24 soat o‘tishi kerak." };
    }
    const key = deviceId(token) || digest(identifier || "unknown-device");
    const item = state.pending[key] || { count: 0, wrong: 0, lockUntil: 0 };
    if (item.lockUntil > now()) return { ok: false, status: 429, error: "Faollashtirish vaqtincha bloklangan. Bir soatdan keyin urinib ko‘ring." };
    if (!samePhrase(candidate)) {
      item.count = 0;
      item.wrong += 1;
      if (item.wrong >= maxWrong) item.lockUntil = now() + 60 * 60 * 1000;
      state.pending[key] = item;
      await persist();
      return { ok: false, status: item.lockUntil ? 429 : 401, remainingAttempts: Math.max(0, maxWrong - item.wrong), error: "Maxfiy faollashtirish iborasi noto‘g‘ri." };
    }
    item.wrong = 0;
    item.count = Math.min(5, item.count + 1);
    state.pending[key] = item;
    await persist();
    return { ok: true, count: item.count, ready: item.count === 5 };
  }
  async function register(token) {
    await load();
    const id = deviceId(token);
    if (!id) throw new Error("Qurilma tokeni noto‘g‘ri.");
    state.devices[id] = { createdAt: state.devices[id]?.createdAt || now(), lastSeenAt: now() };
    delete state.pending[id];
    await persist();
  }
  async function markLogout(token) {
    await load();
    const id = deviceId(token);
    if (id && state.devices[id]) state.devices[id].lastSeenAt = now();
    state.lastLogoutAt = now();
    await persist();
  }
  async function ready(token, identifier) {
    await load();
    const key = deviceId(token) || digest(identifier || "unknown-device");
    return state.pending[key]?.count === 5;
  }
  function issueToken() { return crypto.randomBytes(32).toString("base64url"); }
  async function list() {
    await load();
    return { trustedDevices: Object.keys(state.devices).length, lastLogoutAt: state.lastLogoutAt || null };
  }
  return { step, register, markLogout, ready, isTrusted, canEnroll, issueToken, list };
}

module.exports = { createAdminDeviceGate };
