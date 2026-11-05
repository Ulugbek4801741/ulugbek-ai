"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const language = require("../modules/language-module");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createLanguageCognition } = require("../modules/language-cognition");

test("detects Uzbek Latin and preserves script", () => {
  const result = language.detectLanguage("Menga yordam ber, bu qanday ishlaydi?");
  assert.equal(result.code, "uz");
  assert.equal(result.script, "latin");
});
test("detects Uzbek Cyrillic", () => {
  const result = language.detectLanguage("Менга ёрдам беринг, бу қандай ишлайди?");
  assert.equal(result.code, "uz");
  assert.equal(result.script, "cyrillic");
});
test("detects Russian and English", () => {
  assert.equal(language.detectLanguage("Здравствуйте, помогите мне пожалуйста").code, "ru");
  assert.equal(language.detectLanguage("Hello, can you help me with this?").code, "en");
});
test("explicit requested language overrides message language", () => {
  const result = language.detectLanguage("Iltimos, answer in English");
  assert.equal(result.code, "en");
  assert.equal(result.explicit, true);
});
test("language instruction gives the shared agent response policy", () => {
  const prompt = language.buildLanguageInstruction("Salom, menga yordam bering");
  assert.match(prompt, /O‘zbek tilida/);
  assert.match(prompt, /lotin\/kirill/);
});
test("status does not falsely claim neural model training", () => {
  assert.equal(language.status().ready, true);
  assert.equal(language.status().neuralModelTraining, false);
});


test("self-learning language cognition trains from approved-domain public corpus without claiming neural weights", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-language-"));
  try {
    const engine = createLanguageCognition({ dataDir });
    await engine.initialize();
    const sentences = [
      "O‘zbek tilini o‘rganish uchun muntazam mashq qilish va yangi so‘zlarni tushunish juda muhim.",
      "Dasturlashni o‘rganish uchun avval algoritm va oddiy masalalarni bosqichma-bosqich yechish kerak.",
      "Sun’iy intellekt matnlarni tahlil qilish va foydali javoblar tayyorlash uchun ishlatiladi.",
      "Til modeli so‘zlar va gaplar orasidagi statistik bog‘lanishlarni ma’lumotlardan o‘rganadi.",
      "Ishonchli manbalarni tekshirish noto‘g‘ri ma’lumot tarqalishining oldini olishga yordam beradi.",
      "Kompyuter dasturi ma’lumotlarni qabul qiladi qayta ishlaydi va natijani foydalanuvchiga qaytaradi.",
      "O‘zbek tili lotin va kirill yozuvlarida ishlatiladi hamda boy grammatik tuzilishga ega.",
      "Matematika mantiqiy fikrlashni rivojlantiradi va murakkab muammolarni yechishga yordam beradi.",
      "Internet orqali ochiq bilimlarni o‘rganishda manba qoidalariga va mualliflik huquqiga rioya qilish zarur.",
      "Yaxshi yordamchi savol ma’nosini tushunib aniq va sodda javob berishga harakat qiladi.",
      "Dasturiy ta’minotni sinash xatolarni aniqlash va tizim sifatini yaxshilash uchun kerak.",
      "O‘quv ma’lumotlari toza va xilma-xil bo‘lsa til statistikasi ham foydaliroq bo‘lishi mumkin."
    ];
    const result = await engine.trainFromEntries([{
      title: "O‘zbek tili va texnologiya",
      source: "https://uz.wikipedia.org/wiki/Test_language_learning",
      language: "uz",
      status: "pending-review",
      content: sentences.join(" "),
      createdAt: new Date().toISOString()
    }, {
      title: "Untrusted source must be ignored",
      source: "https://example.com/not-allowed",
      language: "uz",
      status: "approved",
      content: sentences.join(" ")
    }]);
    assert.equal(result.addedSources, 1);
    assert.equal(result.corpusSources, 1);
    assert.ok(result.sentences >= 8);
    assert.deepEqual(result.languages, ["uz"]);
    assert.equal(result.neuralWeightsTrained, false);
    assert.equal(engine.status().modelTrained, true);
    assert.equal(engine.status().languages.uz.predictionReady, true);
    assert.equal(engine.status().neuralWeightsTrained, false);
    const stored = JSON.parse(await fs.readFile(path.join(dataDir, "language-cognition-corpus.json"), "utf8"));
    assert.equal(stored.length, 1);
    assert.equal(stored[0].sourceReviewStatus, "pending-review");
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test("rejects untrusted source URLs before adding them to the language corpus", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-language-"));
  try {
    const engine = createLanguageCognition({ dataDir });
    await engine.initialize();
    const result = await engine.trainFromEntries([{
      title: "Unsafe",
      source: "http://uz.wikipedia.org/wiki/Unsafe",
      language: "uz",
      status: "approved",
      content: "Bu matn til modelini o‘rgatish uchun yetarli darajada uzun va tushunarli jumlalardan tashkil topgan."
    }]);
    assert.equal(result.addedSources, 0);
    assert.equal(engine.status().modelTrained, false);
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
