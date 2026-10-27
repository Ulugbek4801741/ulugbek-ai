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

test("ULUG‘BEK GLOBAL INQIROZ Integratsiyalar katalogining birinchi elementi", () => {
  assert.ok(app.indexOf('id:"crisis",name:"ULUG‘BEK GLOBAL INQIROZ"') < app.indexOf('id:"install",name:"ULUGBEK AI — bosh ekranga qo‘shish"'));
  assert.match(app, /location\.href="\.\/global-crisis\.html"/);
});

test("Global Inqiroz modulida ruxsatli joylashuv, ochiq ob-havo va zilzila manbalari bor", () => {
  const crisis = fs.readFileSync(path.join(__dirname, "..", "public", "global-crisis.html"), "utf8");
  assert.match(crisis, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(crisis, /api\.open-meteo\.com/);
  assert.match(crisis, /earthquake\.usgs\.gov/);
  assert.match(crisis, /fdsnws\/event\/1\/query/);
  assert.match(crisis, /starttime=2000-01-01/);
  assert.match(crisis, /localStorage\.setItem\(key/);
  assert.match(crisis, /Yordam xabarini tayyorlash/);
  assert.match(crisis, /Zilzilani aniq sana\/joy bilan oldindan aytishning ishonchli usuli/);
  assert.match(worker, /"global-crisis\.html"/);
});

test("Chat oynasida AI adashishi mumkinligi haqidagi kichik eslatma ko‘rinadi", () => {
  assert.match(html, /ULUGBEK AI ham adashishi mumkin/);
  assert.match(html, /ai-accuracy-note/);
});
