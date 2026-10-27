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

test("Server bo‘lmaganda mahalliy demo chat, reja va modullar ishlash yo‘li mavjud", () => {
  assert.match(app, /function localDemoReply\(prompt\)/);
  assert.match(app, /if\(!base\)return localDemoReply\(prompt\)/);
  assert.match(app, /MAHALLIY DEMO REJA/);
  assert.match(app, /Mahalliy demo katalog — server ulanmagan/);
});

test("Server talab qilmaydigan admin sinov paneli navigatsiyada mavjud", () => {
  const admin = fs.readFileSync(path.join(__dirname, "..", "public", "admin-demo.html"), "utf8");
  assert.match(html, /href="\.\/admin-demo\.html"/);
  assert.match(admin, /Admin panel — sinov rejimi/);
  assert.match(admin, /Mahalliy testlarni bajarish/);
  assert.match(admin, /LocalStorage/);
});
