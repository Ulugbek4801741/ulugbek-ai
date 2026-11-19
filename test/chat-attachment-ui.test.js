"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const app = fs.readFileSync(path.join(root, "public/app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");

test("chat composer and server accept the same 12,000-character message limit", () => {
  assert.match(server, /MAX_CHAT_MESSAGE_LENGTH = 12000/);
  assert.match(server, /message\.length > MAX_CHAT_MESSAGE_LENGTH/);
  assert.match(html, /id="message"[^>]*maxlength="12000"/);
});

test("text file attachments are read and included in the chat prompt", () => {
  assert.match(app, /selectedAttachments/);
  assert.match(app, /await file\.text\(\)/);
  assert.match(app, /Fayl mazmuni:/);
  assert.doesNotMatch(app, /Hozirgi server API faylni AI chatga yuklamaydi; fayl yuborilmadi/);
});

test("unsupported image and video analysis is disclosed instead of falsely claiming upload", () => {
  assert.match(app, /Rasm va video tahlili hali AI serveriga ulanmagan/);
});
