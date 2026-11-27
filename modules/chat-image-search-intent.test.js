"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { imageIntent } = require("./chat-image-search");

test("explicit image requests are detected in Uzbek and English", () => {
  for (const query of [
    "Rasm chizib ber quyosh chiqishini",
    "Quyosh chiqishini rasm yarat",
    "Create an image of sunrise",
    "Generate a picture of a cat",
    "Show me a photo of Bukhara"
  ]) assert.equal(imageIntent(query), true, query);
});

test("ordinary information and conversation do not trigger image search", () => {
  for (const query of [
    "Buxoro haqida ma'lumot ber",
    "Kogon shahri haqida batafsil ma'lumot",
    "Salom",
    "Rahmat",
    "Python kodini tuzat"
  ]) assert.equal(imageIntent(query), false, query);
});
