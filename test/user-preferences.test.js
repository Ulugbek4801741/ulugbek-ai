"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createUserPreferences } = require("../modules/user-preferences");

test("detects common Uzbek requests for a permanent Uzbek response language", () => {
  const preferences = createUserPreferences({ filePath: path.join(os.tmpdir(), "ulugbek-language-detect-" + process.pid + ".json") });
  assert.equal(preferences.detect("Menga har doim o‘zbek tilida javob ber"), "uz");
  assert.equal(preferences.detect("Faqatgina o‘zbek tilida javob ber"), "uz");
  assert.equal(preferences.detect("Iltimos, doimo o‘zbekcha gapir"), "uz");
});

test("stores language preference per session and reloads it after module restart", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ulugbek-preferences-"));
  const filePath = path.join(directory, "preferences.json");
  const first = createUserPreferences({ filePath });
  const result = first.apply("session-user-123456", "Menga har doim o‘zbek tilida javob ber");
  assert.equal(result.changed, true);
  assert.equal(result.preference.code, "uz");

  const second = createUserPreferences({ filePath });
  assert.equal(second.get("session-user-123456").code, "uz");
  assert.equal(second.get("another-session-123"), null);
  assert.equal(second.status().storesChatContent, false);
});

test("does not accept invalid session identifiers or unsupported language values", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ulugbek-preferences-invalid-"));
  const preferences = createUserPreferences({ filePath: path.join(directory, "preferences.json") });
  assert.equal(preferences.set("short", "uz"), false);
  assert.equal(preferences.set("session-user-123456", "fr"), false);
  assert.equal(preferences.get("session-user-123456"), null);
});
