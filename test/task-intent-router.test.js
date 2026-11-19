"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {route}=require("../modules/task-intent-router");
test("coding tasks avoid unnecessary web research and use engineer",()=>{const r=route("Python dastur kodini yozib ber");assert.equal(r.category,"coding");assert.equal(r.needsWebResearch,false);assert.ok(r.roles.includes("engineer"));});
test("translation and documents select specialists",()=>{const t=route("Ushbu matnni inglizchaga tarjima qil"),d=route("Menga rezyume va PDF hisobot tayyorlab ber");assert.equal(t.category,"translation");assert.ok(t.roles.includes("translator"));assert.equal(d.category,"document");assert.ok(d.roles.includes("documenter"));assert.equal(d.needsWebResearch,false);});
test("current and explicit research requests require sources",()=>{const a=route("Bugungi O'zbekiston yangiliklarini tekshir"),b=route("Rasmiy manbalarni qidirib topib ber");assert.equal(a.needsWebResearch,true);assert.equal(b.needsWebResearch,true);assert.ok(a.roles.includes("verifier"));});
test("legal and business tasks select matching roles",()=>{assert.ok(route("Mehnat qonuni bo'yicha huquqiy maslahat").roles.includes("legal"));assert.ok(route("Biznes marketing rejasini tuz").roles.includes("business"));});
test("greetings stay local",()=>{const r=route("Salom");assert.equal(r.category,"conversation");assert.equal(r.needsWebResearch,false);});
