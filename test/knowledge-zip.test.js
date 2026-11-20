"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const yazl = require("yazl");
const { importKnowledgeZip, validateEntryName, containsSecret } = require("../modules/knowledge-zip");

function makeZip(entries) {
  return new Promise((resolve, reject) => {
    const zip = new yazl.ZipFile();
    for (const [name, value] of entries) zip.addBuffer(Buffer.from(value), name);
    const chunks = [];
    zip.outputStream.on("data", chunk => chunks.push(chunk));
    zip.outputStream.on("error", reject);
    zip.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
    zip.end();
  });
}

test("ZIP member paths reject traversal and platform absolute paths", () => {
  assert.equal(validateEntryName("../outside.txt"), false);
  assert.equal(validateEntryName("folder/../../outside.txt"), false);
  assert.equal(validateEntryName("C:/outside.txt"), false);
  assert.equal(validateEntryName("/etc/passwd"), false);
  assert.equal(validateEntryName("docs/readme.md"), true);
});

test("secret scanner catches private keys and common API credentials", () => {
  assert.equal(containsSecret("-----BEGIN PRIVATE KEY-----"), true);
  assert.equal(containsSecret("OPENAI_API_KEY=sk-verysecret"), true);
  assert.equal(containsSecret("Oddiy hujjat, maxfiy ma’lumot yo‘q."), false);
});

test("ZIP import adds supported text files to retrieval-only knowledge", async () => {
  const zip = await makeZip([
    ["docs/guide.md", "ULUGBEK AI uchun ochiq bilim hujjati. ".repeat(8)],
    ["run.exe", "not executable content"],
    ["secrets.txt", "OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz123456"]
  ]);
  const calls = [];
  const store = { ingest: async input => {
    calls.push(input);
    return { documentId: "doc-" + calls.length, chunks: 1 };
  }};
  const result = await importKnowledgeZip(zip, store);
  assert.equal(result.importedFiles, 1);
  assert.equal(calls.length, 1);
  assert.match(calls[0].source, /^user:\/\/zip\//);
  assert.match(calls[0].content, /ULUGBEK AI/);
  assert.equal(result.skipped.length, 2);
});

test("ZIP import rejects a traversal member before ingesting any file", async () => {
  // yazl correctly refuses unsafe names, so mutate both ZIP filename headers
  // after creating a valid archive to simulate an attacker-crafted upload.
  const zip = await makeZip([["safe.txt", "This is a long text document. ".repeat(5)]]);
  const safeName = Buffer.from("safe.txt");
  const maliciousName = Buffer.from("../evilx"); // same byte length
  let offset = 0;
  let replacements = 0;
  while ((offset = zip.indexOf(safeName, offset)) !== -1) {
    maliciousName.copy(zip, offset);
    offset += maliciousName.length;
    replacements += 1;
  }
  assert.equal(replacements, 2);
  const store = { ingest: async () => { throw new Error("must not be called"); } };
  await assert.rejects(() => importKnowledgeZip(zip, store), /(?:xavfli fayl yo‘li|invalid relative path)/);
});
