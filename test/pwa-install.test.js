"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const app = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
const worker = fs.readFileSync(path.join(__dirname, "..", "public", "sw.js"), "utf8");

test("Integrations katalogida ULUGBEK AI o‘rnatish amali mavjud", () => {
  assert.match(app, /id:"install",name:"ULUGBEK AI — bosh ekranga qo‘shish"/);
  assert.match(app, /p\.kind==="install"\?"Bosh ekranga qo‘shish"/);
  assert.match(app, /if\(id==="install"\)/);
});

test("PWA o‘rnatish so‘rovi va iOS uchun qo‘lda qo‘shish yo‘riqnomasi mavjud", () => {
  assert.match(app, /beforeinstallprompt/);
  assert.match(app, /navigator\.serviceWorker\.register\("\.\/sw\.js"\)/);
  assert.match(app, /Add to Home Screen/);
  assert.match(html, /manifest\.webmanifest/);
  assert.match(worker, /addAll\(APP_SHELL\)/);
});

test("Integratsiyalar foydalanuvchiga haqiqiy o‘rnatish taklifi yo‘q bo‘lganda muqobil yo‘lni ko‘rsatadi", () => {
  assert.match(app, /Install app/);
  assert.match(app, /Bosh ekranga qo‘shish/);
});
