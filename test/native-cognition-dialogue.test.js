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
test("tasdiqlangan bilimdan manbali dalil qaytaradi", () => {
  const entries = [{title:"Yer",content:"Yer Quyosh atrofida aylanadigan sayyoradir. U Quyosh tizimining uchinchi sayyorasi hisoblanadi.",source:"https://uz.wikipedia.org/wiki/Yer"}];
  const result = cognition.respond("Yer qaysi sayyora?", entries);
  assert.equal(result.reasoning.answerable, true);
  assert.match(result.reply, /Manbalar:/);
});
