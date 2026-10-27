"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const STORE_PATH = path.resolve(process.env.ADMIN_WORKSPACE_STORE_PATH || path.join(__dirname, "..", "data", "admin-workspace.json"));
let state = { services: [], contracts: [] };
let ready;
let writes = Promise.resolve();
const MAX_RECORDS = 500;

async function initialize() {
  try {
    const parsed = JSON.parse(await fs.readFile(STORE_PATH, "utf8"));
    if (parsed && typeof parsed === "object") {
      state = {
        services: Array.isArray(parsed.services) ? parsed.services.slice(-MAX_RECORDS) : [],
        contracts: Array.isArray(parsed.contracts) ? parsed.contracts.slice(-MAX_RECORDS) : []
      };
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
async function ensureReady() {
  if (!ready) ready = initialize();
  await ready;
}
async function persist() {
  const snapshot = JSON.stringify(state, null, 2);
  writes = writes.then(async () => {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    const temp = STORE_PATH + ".tmp";
    await fs.writeFile(temp, snapshot, { mode: 0o600 });
    await fs.rename(temp, STORE_PATH);
  });
  await writes;
}
function clean(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
async function createService(input, adminEmail) {
  await ensureReady();
  const prompt = clean(input?.prompt, 4000);
  if (prompt.length < 8) {
    const error = new Error("Xizmat vazifasi kamida 8 belgidan iborat bo‘lishi kerak.");
    error.status = 400;
    throw error;
  }
  const now = new Date().toISOString();
  const item = {
    id: crypto.randomUUID(),
    prompt,
    title: clean(input?.title, 120) || prompt.split(/[.!?\n]/)[0].slice(0, 120),
    platforms: Array.isArray(input?.platforms) ? [...new Set(input.platforms.filter(x => ["web", "android", "windows", "ios"].includes(x)))] : ["web"],
    status: "pending_review",
    approvalStatus: "pending",
    createdAt: now,
    updatedAt: now,
    createdBy: clean(adminEmail, 254) || "admin",
    reviewNote: ""
  };
  state.services.push(item);
  state.services = state.services.slice(-MAX_RECORDS);
  await persist();
  return { ...item };
}
async function listServices() {
  await ensureReady();
  return state.services.slice().reverse().map(item => ({ ...item }));
}
async function reviewService(id, decision, note) {
  await ensureReady();
  if (!["approved", "rejected", "changes_requested"].includes(decision)) {
    const error = new Error("Qaror approved, rejected yoki changes_requested bo‘lishi kerak.");
    error.status = 400;
    throw error;
  }
  const item = state.services.find(x => x.id === id);
  if (!item) return null;
  item.approvalStatus = decision;
  item.status = decision === "approved" ? "approved_for_build" : decision;
  item.reviewNote = clean(note, 1000);
  item.updatedAt = new Date().toISOString();
  await persist();
  return { ...item };
}
async function createContract(input) {
  await ensureReady();
  const company = clean(input?.company, 160);
  const contactName = clean(input?.contactName, 120);
  const email = clean(input?.email, 254).toLowerCase();
  const description = clean(input?.description, 3000);
  if (company.length < 2 || contactName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || description.length < 20) {
    const error = new Error("Kompaniya, mas’ul shaxs, to‘g‘ri email va kamida 20 belgili xizmat tavsifi kerak.");
    error.status = 400;
    throw error;
  }
  const item = {
    id: crypto.randomUUID(),
    company, contactName, email,
    phone: clean(input?.phone, 40),
    description,
    status: "pending_review",
    createdAt: new Date().toISOString(),
    reviewNote: ""
  };
  state.contracts.push(item);
  state.contracts = state.contracts.slice(-MAX_RECORDS);
  await persist();
  return { id: item.id, status: item.status, createdAt: item.createdAt };
}
async function listContracts() {
  await ensureReady();
  return state.contracts.slice().reverse().map(item => ({ ...item }));
}
async function reviewContract(id, decision, note) {
  await ensureReady();
  if (!["approved_for_negotiation", "rejected", "needs_information"].includes(decision)) {
    const error = new Error("Noto‘g‘ri shartnoma qarori.");
    error.status = 400;
    throw error;
  }
  const item = state.contracts.find(x => x.id === id);
  if (!item) return null;
  item.status = decision;
  item.reviewNote = clean(note, 1000);
  item.reviewedAt = new Date().toISOString();
  await persist();
  return { ...item };
}
module.exports = { createService, listServices, reviewService, createContract, listContracts, reviewContract };
