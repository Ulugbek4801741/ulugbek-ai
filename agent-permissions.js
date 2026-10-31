"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const DATA_DIR = path.resolve(process.env.ULUGBEK_DATA_DIR || path.join(__dirname, "data"));
const STORE = path.resolve(process.env.AGENT_PERMISSIONS_STORE || path.join(DATA_DIR, "agent-permissions.json"));
const DEFINITIONS = Object.freeze({
  repository_read: { label: "Loyihaning kodlarini o‘qish va tahlil qilish", default: true },
  internet_research: { label: "Ochiq internet manbalarini izlash", default: true },
  knowledge_save: { label: "Tekshirilgan bilimlarni xotiraga saqlash", default: false },
  code_proposals: { label: "Kod o‘zgarishi uchun taklif tayyorlash", default: true },
  file_create: { label: "GitHub ishchi tarmog‘ida yangi fayl yaratish", default: false },
  file_update: { label: "GitHub ishchi tarmog‘ida fayl tahrirlash", default: false },
  file_delete: { label: "GitHub ishchi tarmog‘ida fayl o‘chirish", default: false },
  branch_write: { label: "Alohida ishchi tarmoqqa commit yozish", default: false },
  pull_request_create: { label: "Tayyor o‘zgarishlardan Pull Request ochish", default: false },
  automated_tests: { label: "Xavfsiz, cheklangan avtomatik testlar", default: false }
});
const LOCKED = Object.freeze({
  main_branch_write: "Asosiy main tarmog‘iga to‘g‘ridan-to‘g‘ri yozish — bloklangan",
  direct_source_write: "Manba kodini to‘g‘ridan-to‘g‘ri o‘zgartirish — bloklangan",
  production_deploy: "Serverga avtomatik chiqarish — hozircha bloklangan",
  secret_access: "Maxfiy kalit va parollarni o‘qish — bloklangan",
  user_data_delete: "Foydalanuvchi ma’lumotlarini o‘chirish — bloklangan"
});
let state = null;
let writeChain = Promise.resolve();

function defaults() {
  return {
    version: 1,
    updatedAt: null,
    updatedBy: null,
    capabilities: Object.fromEntries(Object.entries(DEFINITIONS).map(([key, item]) => [key, item.default])),
    locked: { ...LOCKED },
    audit: []
  };
}
async function load() {
  if (state) return state;
  state = defaults();
  try {
    const saved = JSON.parse(await fs.readFile(STORE, "utf8"));
    if (saved && typeof saved === "object") {
      state.capabilities = { ...state.capabilities, ...(saved.capabilities || {}) };
      for (const key of Object.keys(DEFINITIONS)) state.capabilities[key] = saved.capabilities?.[key] === true;
      state.updatedAt = saved.updatedAt || null;
      state.updatedBy = saved.updatedBy || null;
      state.audit = Array.isArray(saved.audit) ? saved.audit.slice(0, 100) : [];
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return state;
}
async function save() {
  const snapshot = JSON.stringify(state, null, 2);
  writeChain = writeChain.then(async () => {
    await fs.mkdir(path.dirname(STORE), { recursive: true });
    const temp = STORE + ".tmp";
    await fs.writeFile(temp, snapshot, { mode: 0o600 });
    await fs.rename(temp, STORE);
  });
  return writeChain;
}
async function update(input, adminEmail) {
  await load();
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    const error = new Error("Ruxsatlar formati noto‘g‘ri."); error.status = 400; throw error;
  }
  const unknown = Object.keys(input).filter(key => !Object.hasOwn(DEFINITIONS, key));
  if (unknown.length) {
    const error = new Error("Noma’lum ruxsat: " + unknown.join(", ")); error.status = 400; throw error;
  }
  for (const [key, value] of Object.entries(input)) {
    if (typeof value !== "boolean") {
      const error = new Error("Har bir ruxsat true yoki false bo‘lishi kerak."); error.status = 400; throw error;
    }
    state.capabilities[key] = value;
  }
  state.version++;
  state.updatedAt = new Date().toISOString();
  state.updatedBy = String(adminEmail || "admin").slice(0, 200);
  state.audit.unshift({
    id: crypto.randomUUID(), at: state.updatedAt, by: state.updatedBy,
    changes: { ...input }, note: "Administrator ruxsat siyosatini yangiladi"
  });
  state.audit = state.audit.slice(0, 100);
  await save();
  return snapshot();
}
function snapshot() {
  const current = state || defaults();
  return {
    version: current.version,
    updatedAt: current.updatedAt,
    updatedBy: current.updatedBy,
    capabilities: Object.fromEntries(Object.entries(DEFINITIONS).map(([key, item]) => [key, {
      label: item.label, enabled: current.capabilities[key] === true
    }])),
    locked: { ...LOCKED },
    audit: (current.audit || []).slice(0, 20)
  };
}
module.exports = { load, update, snapshot };
