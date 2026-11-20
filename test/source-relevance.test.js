"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const relevance = require("../modules/source-relevance");

test("accepts sources that match the actual subject", () => {
  const score = relevance.scoreSource("Xitoyning qadimgi tarixi haqida ma'lumot ber", {
    title: "Qadimgi Xitoy tarixi",
    snippet: "Xitoyda Shan, Chjou, Sin va Xan sulolalari davrida davlat rivojlangan."
  });
  assert.equal(score.relevant, true);
  assert.ok(score.matchedTerms.includes("xitoy"));
});

test("rejects a high-authority but unrelated OCR source for a literature question", () => {
  const score = relevance.scoreSource("Badiiy matnlarni tahlil qilish metodikasi", {
    title: "OCR dasturlari va hujjatlarni raqamlashtirish",
    snippet: "Optik belgilarni aniqlash, skanerlangan hujjatlar va matnni tanib olish."
  });
  assert.equal(score.relevant, false);
});

test("filters unrelated sources before returning search results", () => {
  const selected = relevance.filterRelevantSources("Xitoy qadimgi tarixi", [
    { title: "OCR texnologiyasi", snippet: "Hujjatlarni tanib olish" },
    { title: "Qadimgi Xitoy tarixi", snippet: "Xitoy sulolalari tarixi" }
  ]);
  assert.equal(selected.length, 1);
  assert.match(selected[0].title, /Xitoy/);
});

test("does not treat generic question words as subject evidence", () => {
  const score = relevance.scoreSource("Menga bu haqida ma'lumot ber", {
    title: "OCR software tools",
    snippet: "Optical character recognition technology"
  });
  assert.equal(score.relevant, false);
});


test("rejects a medicine passage that only lists India and separately mentions history", () => {
  const reply = "Tabobat tarixi insoniyat tarixi bilan bog‘liq. Qadimgi Sharqda Misr, Hindiston va Markaziy Osiyo xalqlari kasalliklarni o‘rgangan.";
  const score = relevance.scoreSource("Hindiston tarixi haqida ma'lumot ber", { title: "", snippet: reply });
  assert.equal(score.relevant, false);
});

test("rejects a world internet statistic for an India population question", () => {
  const reply = "Dunyo aholisining soni yetti milliarddan oshgan, shundan uch milliarddan ziyodi internetga ulangan.";
  const score = relevance.scoreSource("Menga hozir Hindiston aholi soni haqida ma'lumot ber", { title: "", snippet: reply });
  assert.equal(score.relevant, false);
});

test("accepts a focused India history passage", () => {
  const reply = "Hindiston tarixi qadimgi Hind vodiysi sivilizatsiyasidan boshlanadi. Keyinchalik Hindistonda Maurya va Gupta imperiyalari rivojlangan.";
  const score = relevance.scoreSource("Hindiston tarixi haqida ma'lumot ber", { title: "", snippet: reply });
  assert.equal(score.relevant, true);
});

test("accepts a focused India population answer", () => {
  const reply = "Hindiston aholisi 2025-yilda BMT ma'lumotiga ko‘ra taxminan 1,464 milliard kishini tashkil etgan.";
  const score = relevance.scoreSource("Menga hozir Hindiston aholi soni haqida ma'lumot ber", { title: "", snippet: reply });
  assert.equal(score.relevant, true);
});


test("removes Uzbek request stop words before suffix normalization", () => {
  const queryTerms = relevance.terms("Menga hozir Hindiston aholi soni haqida ma'lumot ber");
  assert.deepEqual(queryTerms, ["hindiston", "ahol", "son"]);
});


test("matches English India population sources to an Uzbek current population question", () => {
  const score = relevance.scoreSource("Hindiston aholisi soni hozir qancha?", {
    title: "India population 2026 estimate",
    snippet: "India population in 2026 is estimated at 1,476,625,576 people."
  });
  assert.equal(score.relevant, true);
});

test("matches English history sources to an Uzbek India history question", () => {
  const score = relevance.scoreSource("Hindiston tarixi haqida ma'lumot ber", {
    title: "History of India",
    snippet: "The history of India begins with the Indus Valley civilization."
  });
  assert.equal(score.relevant, true);
});

test("treats Uzbek maʼlumot as a request word, not part of the subject", () => {
  assert.deepEqual(relevance.terms("Buxoro haqida maʼlumot ber"), ["buxoro"]);
  const score = relevance.scoreSource("Buxoro haqida maʼlumot ber", {
    title: "Bukhara — history, culture and city information",
    snippet: "Bukhara is a historic city in Uzbekistan, known for its old town and monuments."
  });
  assert.equal(score.relevant, true);
});


test("accepts Kogon city sources when Uzbek administrative words are in the query", () => {
  const question = "Buxoro viloyati Kogon shahri haqida ma'lumot ber";
  const score = relevance.scoreSource(question, {
    title: "Kogon — city in Bukhara Region",
    snippet: "Kogon is a city in Bukhara Region, Uzbekistan, and an important railway and industrial centre."
  });
  assert.equal(score.relevant, true);
  assert.ok(score.matchedTerms.includes("kogon"));
  assert.ok(score.matchedTerms.includes("buxoro"));
});

test("matches the Russian historical name Kagan to Kogon", () => {
  const score = relevance.scoreSource("Kogon shahri haqida ma'lumot ber", {
    title: "Старый железнодорожный вокзал Каган",
    snippet: "Историческая железнодорожная станция Каган находится в городе Когон, Узбекистан."
  });
  assert.equal(score.relevant, true);
  assert.ok(score.matchedTerms.includes("kogon"));
});

test("does not accept unrelated sources just because they mention Bukhara", () => {
  const score = relevance.scoreSource("Buxoro viloyati Kogon shahri tarixi", {
    title: "Bukhara tourism and hotels",
    snippet: "Bukhara is known for its hotels, restaurants and tourist services."
  });
  assert.equal(score.relevant, false);
});


test("normalizes Uzbek Buxoro and English Bukhara to the same canonical place term", () => {
  assert.deepEqual(relevance.terms("Buxoro shahri"), ["buxoro"]);
  assert.deepEqual(relevance.terms("Bukhara city"), ["buxor"]);
});

test("accepts Kogon city sources that use the English spelling Bukhara", () => {
  const score = relevance.scoreSource("Buxoro viloyati Kogon shahri haqida batafsil ma'lumot ber", {
    title: "Kogon — city in Bukhara Region",
    snippet: "Kogon is a city in Bukhara Region, Uzbekistan, and an important railway and industrial centre."
  });
  assert.equal(score.relevant, true);
  assert.deepEqual(score.queryTerms, ["buxoro", "kogon"]);
});
