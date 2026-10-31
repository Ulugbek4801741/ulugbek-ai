"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

function createAdminAuth(options = {}) {
  const accessCode = String(options.accessCode ?? process.env.ADMIN_ACCESS_CODE ?? "");
  const sessionSecret = String(options.sessionSecret ?? process.env.ADMIN_SESSION_SECRET ?? "");
  const storePath = options.storePath ? path.resolve(options.storePath) : null;
  const now = typeof options.now === "function" ? options.now : Date.now;
  const maxAttempts = Number.isInteger(options.maxAttempts) ? options.maxAttempts : 5;
  const lockoutMs = Number.isFinite(options.lockoutMs) ? options.lockoutMs : 60 * 60 * 1000;
  const sessionTtlMs = Number.isFinite(options.sessionTtlMs) ? options.sessionTtlMs : 60 * 60 * 1000;
  const attempts = new Map();
  const revoked = new Set();
  let loaded = false;
  let writeChain = Promise.resolve();

  function configured() {
    return accessCode.length >= 8 && sessionSecret.length >= 32;
  }
  function keyFor(identifier) {
    return crypto.createHmac("sha256", sessionSecret || "unconfigured")
      .update(String(identifier || "unknown"))
      .digest("hex");
  }
  function sameCode(candidate) {
    const actual = crypto.createHash("sha256").update(String(candidate)).digest();
    const expected = crypto.createHash("sha256").update(accessCode).digest();
    return crypto.timingSafeEqual(actual, expected);
  }
  async function load() {
    if (loaded) return;
    loaded = true;
    if (!storePath) return;
    try {
      const saved = JSON.parse(await fs.readFile(storePath, "utf8"));
      for (const [key, value] of Object.entries(saved.entries || {})) {
        if (/^[a-f0-9]{64}$/.test(key) && value && Number.isInteger(value.count) && Number.isFinite(value.lockUntil)) {
          attempts.set(key, { count: Math.max(0, Math.min(maxAttempts, value.count)), lockUntil: Math.max(0, value.lockUntil) });
        }
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  async function persist() {
    if (!storePath) return;
    const entries = Object.fromEntries([...attempts.entries()]);
    const snapshot = JSON.stringify({ version: 1, entries }, null, 2);
    writeChain = writeChain.then(async () => {
      await fs.mkdir(path.dirname(storePath), { recursive: true });
      const temp = storePath + ".tmp";
      await fs.writeFile(temp, snapshot, { mode: 0o600 });
      await fs.rename(temp, storePath);
    });
    await writeChain;
  }
  function sign(payload) {
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto.createHmac("sha256", sessionSecret).update(encoded).digest("base64url");
    return encoded + "." + signature;
  }
  function verifySession(token) {
    if (!configured() || typeof token !== "string") return false;
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const expected = crypto.createHmac("sha256", sessionSecret).update(parts[0]).digest("base64url");
    const left = Buffer.from(parts[1]);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return false;
    try {
      const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
      return payload.role === "admin" && typeof payload.jti === "string" &&
        Number.isFinite(payload.exp) && payload.exp > now() && !revoked.has(payload.jti);
    } catch (_) {
      return false;
    }
  }
  async function loginInternal({ code, identifier } = {}) {
    if (!configured()) return { ok: false, status: 503, error: "Administrator kirish kodi serverda xavfsiz sozlanmagan." };
    if (typeof code !== "string" || code.length < 1 || code.length > 256) {
      return { ok: false, status: 400, error: "Kirish kodi noto‘g‘ri formatda." };
    }
    await load();
    const key = keyFor(identifier);
    const current = attempts.get(key) || { count: 0, lockUntil: 0 };
    if (current.lockUntil > now()) {
      return { ok: false, status: 429, lockedUntil: current.lockUntil, error: "Kirish vaqtincha bloklangan. Bir soatdan keyin qayta urinib ko‘ring." };
    }
    if (!sameCode(code)) {
      current.count += 1;
      if (current.count >= maxAttempts) {
        current.count = maxAttempts;
        current.lockUntil = now() + lockoutMs;
      }
      attempts.set(key, current);
      await persist();
      const locked = current.lockUntil > now();
      return {
        ok: false,
        status: locked ? 429 : 401,
        remainingAttempts: Math.max(0, maxAttempts - current.count),
        lockedUntil: locked ? current.lockUntil : null,
        error: locked ? "5 ta noto‘g‘ri urinishdan keyin kirish 1 soatga bloklandi." : "Kirish kodi noto‘g‘ri."
      };
    }
    attempts.delete(key);
    await persist();
    const issuedAt = now();
    const token = sign({ role: "admin", jti: crypto.randomUUID(), iat: issuedAt, exp: issuedAt + sessionTtlMs });
    return { ok: true, token, expiresAt: issuedAt + sessionTtlMs };
  }
  let loginQueue = Promise.resolve();
  function login(input) {
    const operation = loginQueue.then(() => loginInternal(input));
    loginQueue = operation.then(() => undefined, () => undefined);
    return operation;
  }
  function revoke(token) {
    if (typeof token !== "string") return false;
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    try {
      const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
      if (typeof payload.jti !== "string") return false;
      revoked.add(payload.jti);
      return true;
    } catch (_) {
      return false;
    }
  }
  return { configured, load, login, verifySession, revoke };
}

module.exports = { createAdminAuth };
