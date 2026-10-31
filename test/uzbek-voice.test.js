const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const app = fs.readFileSync("public/app.js", "utf8");
const voice = fs.readFileSync("public/voice.js", "utf8");

test("main chat only selects an installed Uzbek voice for Uzbek playback", () => {
  assert.ok(app.includes('lang.toLowerCase().startsWith("uz")'));
  assert.ok(app.includes('x.lang.toLowerCase()==="uz-uz"'));
  assert.ok(app.toLowerCase().includes("o‘zbekcha ovoz serveri hali ulanmagan"));
  assert.ok(!app.includes("startsWith(pref).*speakWithVoice(text,lang,voice)"));
});

test("voice avatar refuses to substitute a non-Uzbek voice", () => {
  assert.ok(voice.includes('lang.toLowerCase().startsWith("uz")'));
  assert.ok(voice.includes('v.lang.toLowerCase()==="uz-uz"'));
  assert.ok(voice.toLowerCase().includes("o‘zbekcha ovoz serveri ulanmagan"));
});
