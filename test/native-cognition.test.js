"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const cognition = require("../native-cognition");

test("evidence replies are concise and cite a small number of sources", () => {
  const result = cognition.respond("lyustra", [
    { title: "Qo‘llanma 1", source: "https://example.org/one", status: "unverified-public-page-content",
      content: "LED musiqali lyustrani yig‘ishdan oldin elektr ta’minotini uzing. Simlarni ishlab chiqaruvchi ko‘rsatmasiga muvofiq ulang. Ishni yakunlashdan oldin barcha ulanishlarni tekshiring." },
    { title: "Qo‘llanma 2", source: "https://example.org/two", status: "unverified-public-page-content",
      content: "Lyustrani o‘rnatishda avval mahkamlash qismlarini tekshiring. Elektr ulanishlarini malakali mutaxassis bajarishi kerak." }
  ]);
  assert.match(result.reply, /O‘qilgan ochiq manbalar asosida/);
  assert.match(result.reply, /https:\/\/example.org\/one/);
  assert.doesNotMatch(result.reply, /mustaqil mantiqiy mexanizmi topgan dalillar|Mavzu:/);
  assert.ok(result.reply.length < 1200);
  assert.ok(result.reasoning.facts.length >= 1 && result.reasoning.facts.length <= 3);
});

test("unconfirmed search snippets are not presented as approved knowledge", () => {
  const result = cognition.respond("kompyuter stol yig‘ish", [
    { title: "Qidiruv parchasi", source: "https://example.org", status: "unverified-search-snippet",
      content: "Kompyuter stolini yig‘ish bo‘yicha bosqichma-bosqich qo‘llanma mavjud. Unda qismlarni birma-bir ulash tavsiya etiladi." }
  ]);
  assert.match(result.reply, /hali mustaqil tasdiqlanmagan/);
  assert.match(result.reply, /bitta dalil topildi/);
});

test("approved evidence is labeled separately from unverified web material", () => {
  const result = cognition.respond("Respublikasi", [
    { title: "Tarix", source: "https://example.org/history", status: "approved",
      content: "O‘zbekiston Respublikasi 1991-yil 31-avgustda mustaqilligini e’lon qildi. Mustaqillik kuni 1-sentabrda nishonlanadi." }
  ]);
  assert.match(result.reply, /Tasdiqlangan bilimlar asosida/);
});

test("short greeting replies remain short", () => {
  assert.equal(cognition.respond("Salom", []).reply, "Va alaykum assalom! Savolingizni yozing.");
});

test("filters out unrelated search evidence and keeps the requested topic", () => {
  const matches = cognition.filterRelevantEvidence("ish izlash", [
    { title: "LED musiqali lyustra", content: "Lyustrani elektr tarmog‘iga ulash va yig‘ish haqida qo‘llanma." },
    { title: "Ish izlash bo‘yicha qo‘llanma", content: "Ish topish uchun rezyume tayyorlang va vakansiyalarga murojaat qiling." }
  ]);
  assert.equal(matches.length, 1);
  assert.match(matches[0].title, /Ish izlash/);
});

test("normalizes common Uzbek typing mistakes and ChatGPT spelling", () => {
  const normalized = cognition.normalizeInput("Chat GPT sunʼiy endilik agent bilasanmi");
  assert.match(normalized, /chat gpt/);
  assert.match(normalized, /intellekt/);
  assert.match(normalized, /agent/);
});

test("one final conclusion is written instead of listing separate evidence items", () => {
  const result = cognition.respond("kompyuter stol yig‘ish", [
    { title: "Kompyuter stolini yig‘ish", source: "https://example.org/desk", status: "unverified-public-page-content",
      content: "Kompyuter stolini yig‘ishda avval barcha qismlarni tekshiring. Keyin oyoqlarini mahkamlang va stol ustini o‘rnating. Yakunda vintlarni qayta tekshirib chiqing." }
  ]);
  assert.match(result.reply, /Yakuniy xulosa:/);
  assert.doesNotMatch(result.reply, /1\. |2\. |Mavzu:/);
  assert.ok(result.reply.length < 900);
});

test("irrelevant evidence cannot produce an answer", () => {
  const result = cognition.respond("ish izlash", [
    { title: "LED musiqali lyustra", source: "https://example.org/light", status: "unverified-public-page-content",
      content: "LED musiqali lyustrani pult yordamida boshqarish va yig‘ish bosqichlari." }
  ]);
  assert.equal(result.reasoning.answerable, false);
  assert.match(result.reply, /mos va ishonchli dalil topilmadi/);
});
