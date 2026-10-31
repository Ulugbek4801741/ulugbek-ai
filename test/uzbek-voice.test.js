const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const app = fs.readFileSync("public/app.js", "utf8");
const voice = fs.readFileSync("public/voice.js", "utf8");

test("main chat only selects an installed Uzbek voice for Uzbek playback", () => {
  assert.match(app, /lang\.toLowerCase\(\)\.startsWith\("uz"\)/);
  assert.match(app, /x\.lang\.toLowerCase\(\)===\"uz-uz\"/);
  assert.match(app, /Qurilmada o‘zbekcha ovoz topilmadi/);
  assert.doesNotMatch(app, /startsWith\(pref\).*speakWithVoice\(text,lang,voice\)/);
});

test("voice avatar refuses to substitute a non-Uzbek voice", () => {
  assert.match(voice, /lang\.toLowerCase\(\)\.startsWith\("uz"\)/);
  assert.match(voice, /v\.lang\.toLowerCase\(\)===\"uz-uz\"/);
  assert.match(voice, /Qurilmada o‘zbekcha ovoz topilmadi/);
});
