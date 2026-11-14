"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("Android/web app defaults to no remote API without saved consent", () => {
  const config = read("public/config.js");
  assert.match(config, /function hasRemoteConsent\(\)[\s\S]*localStorage\.getItem\(CONSENT_KEY\) === "granted"/);
  assert.match(config, /window\.ULUGBEK_API_BASE_URL = window\.ULUGBEK_REMOTE_DATA_CONSENT \? resolveRemoteApi\(\) : ""/);
  assert.match(config, /catch \(_\) \{ return false; \}/);
});

test("remote API calls are blocked until explicit consent", () => {
  const app = read("public/app.js");
  assert.match(app, /if\(!b\)throw Error\("Maxfiy mahalliy rejim yoqilgan/);
  assert.match(app, /window\.confirm\("Rozilik: chat matni va internet qidiruv so‘rovlari/);
  assert.match(app, /window\.ULUGBEK_SET_REMOTE_DATA_CONSENT\(false\)/);
});

test("cloud speech recognition requires a separate opt-in", () => {
  const html = read("public/index.html");
  const app = read("public/app.js");
  assert.match(html, /id="voice-cloud-consent"/);
  assert.match(app, /window\.ULUGBEK_CLOUD_SPEECH_CONSENT!==true/);
  assert.match(app, /window\.ULUGBEK_REMOTE_DATA_CONSENT!==true/);
});

test("file picker does not upload selected files", () => {
  const app = read("public/app.js");
  assert.match(app, /Hozirgi server API faylni AI chatga yuklamaydi; fayl yuborilmadi/);
});
