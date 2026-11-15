"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const cognition = require("../native-cognition");

test("o‘zbekcha salomlashuvga javob beradi", () => {
  assert.match(cognition.respond("Salom", []).reply, /Va alaykum assalom/);
});
test("o‘zini tanishtiradi", () => {
  assert.match(cognition.respond("Sen kimsan?", []).reply, /ULUGBEK AI/);
});
test("imkoniyatlarini tushuntiradi", () => {
  assert.match(cognition.respond("Nima qila olasan?", []).reply, /bilimlar bazasi/);
});
test("o‘rganish tartibini tushuntiradi va model qayta o‘qitildi demaydi", () => {
  const reply = cognition.respond("Qanday o‘rganasan?", []).reply;
  assert.match(reply, /o‘zbekcha/);
  assert.match(reply, /vaznlarini qayta o‘qitmaydi/);
});
test("rahmatga tabiiy javob beradi", () => {
  assert.match(cognition.respond("Rahmat", []).reply, /Arzimaydi/);
});
test("dalilsiz savolga uydirma javob bermaydi", () => {
  const reply = cognition.respond("Kvazarlar qanday hosil bo‘ladi?", []).reply;
  assert.match(reply, /ishonchli javob topa olmadim/);
});
test("tasdiqlangan bilimdan javob qaytaradi, manbani foydalanuvchiga ko‘rsatmaydi", () => {
  const entries = [{title:"Yer",content:"Yer Quyosh atrofida aylanadigan sayyoradir. U Quyosh tizimining uchinchi sayyorasi hisoblanadi.",source:"https://uz.wikipedia.org/wiki/Yer"}];
  const result = cognition.respond("Yer qaysi sayyora?", entries);
  assert.equal(result.reasoning.answerable, true);
  assert.doesNotMatch(result.reply, /Manba:|https:\/\//i);
});

test("ingliz tilini o‘rganish so‘roviga amaliy birinchi dars beradi", () => {
  const reply = cognition.respond("Menga ingliz tilidan yordam ber", []).reply;
  assert.match(reply, /Hello — Salom/);
  assert.match(reply, /Mashq:/);
});
test("dasturlash yordam so‘roviga aniq keyingi qadamni so‘raydi", () => {
  const reply = cognition.respond("Menga dasturlashda yordam ber", []).reply;
  assert.match(reply, /Python, JavaScript yoki Kotlin/);
});

test("sun’iy intellektni sodda o‘zbek tilida tushuntiradi", () => {
  const reply = cognition.respond("Sun’iy intellekt nima? Oddiy o‘zbek tilida tushuntir.", []).reply;
  assert.match(reply, /kompyuterga odam bajaradigan/);
  assert.match(reply, /savollarga javob beradi/);
  assert.doesNotMatch(reply, /\\[\\d+\\]|XX asr|transformer arxitekturasi/i);
});

test("nolga bo‘lishni xato sifatida tushuntiradi", () => {
  const reply = cognition.respond("569-568÷(0)", []).reply;
  assert.match(reply, /nolga bo‘lish/iu);
  assert.match(reply, /natija aniqlanmaydi/iu);
});
test("umumiy yordam so‘roviga mavzuni aniqlashtiradi", () => {
  const reply = cognition.respond("Menga yordam ber olasanmi", []).reply;
  assert.match(reply, /Qaysi ishda yordam kerak/iu);
  assert.doesNotMatch(reply, /Expert-verified|Question 2/iu);
});
test("AI agent kodi so‘roviga Python karkasini beradi", () => {
  const reply = cognition.respond("Men sun’iy intellekt agent yaratish uchun AI kodini yozib ber", []).reply;
  assert.match(reply, /class UniversalAgent/);
  assert.match(reply, /mustaqil til modeli emas/);
});
test("Temur Lang haqidagi tarixiy savolga javob beradi", () => {
  const reply = cognition.respond("Tarixdan Temur lang nomi bilan tanilgan podshoh haqida ma’lumot ber", []).reply;
  assert.match(reply, /Amir Temur/);
  assert.match(reply, /1336–1405/);
  assert.match(reply, /Samarqand/);
});
