"use strict";

// Shared knowledge bridge: agents can consume only administrator-approved entries.
// Knowledge is treated as evidence/data, never as executable instructions.
const worker = require("./lab-learning-worker");

const MAX_ENTRIES = 5;
const MAX_TITLE = 180;
const MAX_CONTENT = 1600;
const MAX_SOURCE = 500;

function clean(value, max) {
  return String(value || "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

async function retrieve(prompt, limit = MAX_ENTRIES) {
  const safeLimit = Math.max(1, Math.min(MAX_ENTRIES, Number(limit) || MAX_ENTRIES));
  const entries = await worker.searchKnowledge(prompt, safeLimit);
  return entries.map(entry => ({
    title: clean(entry.title, MAX_TITLE),
    content: clean(entry.content, MAX_CONTENT),
    source: clean(entry.source, MAX_SOURCE),
    language: clean(entry.language || "unknown", 12),
    score: Number.isFinite(entry.score) ? entry.score : 0,
    status: "approved"
  })).filter(entry => entry.title && entry.content);
}

function format(entries) {
  if (!Array.isArray(entries) || !entries.length) return "";
  return entries.map((entry, index) => [
    (index + 1) + ". " + clean(entry.title, MAX_TITLE),
    "Til: " + clean(entry.language || "unknown", 12),
    "Dalil: " + clean(entry.content, MAX_CONTENT),
    "Manba: " + clean(entry.source, MAX_SOURCE)
  ].join("\n")).join("\n\n");
}

module.exports = { retrieve, format };
