"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const sources = require("../modules/open-language-sources");
const { createLanguageCognition } = require("../modules/language-cognition");

test("open language sources declare Uzbek, English and Russian public corpora", () => {
  const status = sources.status();
  assert.deepEqual(status.supportedLanguages, ["uz", "en", "ru"]);
  assert.deepEqual(status.languagePriority.map(x => x.sharePercent), [60, 25, 15]);
  assert.ok(status.connectedSources.includes("tatoeba"));
  assert.ok(status.catalogSources.some(x => x.id === "universal-dependencies"));
  assert.ok(status.catalogSources.some(x => x.id === "opus"));
});

test("Tatoeba sentences retain attribution and are never factual auto-approval", () => {
  const row = sources.safeSentence({ id: 123, text: "Salom, siz bugun qanday yordam bera olasiz?", owner: { username: "sample-user" } }, "uz");
  assert.equal(row.status, "pending-review");
  assert.equal(row.license, "CC BY 2.0 FR");
  assert.equal(row.attribution, "sample-user");
  assert.equal(row.factualUseAllowed, false);
  assert.match(row.source, /tatoeba\.org/);
});

test("invalid or unidentifiable Tatoeba rows are rejected", () => {
  assert.equal(sources.safeSentence({ id: 0, text: "This is a sufficiently long sentence." }, "en"), null);
  assert.equal(sources.safeSentence({ id: 42, text: "short" }, "en"), null);
});

test("sync imports bounded open sentences for all three languages as review-pending data", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-language-"));
  const file = path.join(dir, "knowledge.json");
  const calls = [];
  const fetchImpl = async url => {
    calls.push(url);
    const lang = new URL(url).searchParams.get("lang");
    const row = lang === "uzb" ? { id: 101, text: "Salom, bu o‘zbek tilidagi ochiq namuna gapidir." } :
      lang === "eng" ? { id: 202, text: "Hello, this is an open example sentence in English." } :
      { id: 303, text: "Привет, это открытое примерное предложение на русском языке." };
    return { ok: true, status: 200, text: async () => JSON.stringify({ data: [row] }) };
  };
  try {
    const result = await sources.sync({ force: true, fetchImpl, knowledgeFile: file });
    const rows = JSON.parse(await fs.readFile(file, "utf8"));
    assert.equal(calls.length, 3);
    assert.equal(rows.length, 3);
    assert.deepEqual(rows.map(x => x.language).sort(), ["en", "ru", "uz"]);
    assert.ok(rows.every(x => x.status === "pending-review" && x.factualUseAllowed === false));
    assert.equal(result.lastAdded, 3);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});


test("short open corpus sentences enter the language-pattern model, not factual knowledge", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-cognition-"));
  try {
    const engine = createLanguageCognition({ dataDir: dir });
    await engine.initialize();
    const result = await engine.trainFromEntries([{
      source: "https://tatoeba.org/en/sentences/show/90909",
      title: "Tatoeba Uzbek sentence",
      content: "Salom, bugun havo juda yaxshi.",
      language: "uz",
      agent: "AutonomousLanguageCorpusAgent",
      status: "pending-review",
      quality: "open-language-corpus-sentence-unverified",
      license: "CC BY 2.0 FR"
    }]);
    assert.equal(result.addedSources, 1);
    assert.equal(result.neuralWeightsTrained, false);
    const status = engine.status();
    assert.equal(status.factualAutoApproval, false);
    assert.equal(status.corpusSources, 1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
