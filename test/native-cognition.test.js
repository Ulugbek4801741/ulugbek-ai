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
