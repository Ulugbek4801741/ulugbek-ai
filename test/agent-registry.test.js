"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const registry=require("../agents/registry");
test("registrda 15 ta noyob professional agent bor",()=>{const agents=registry.listAgents();assert.equal(agents.length,15);assert.equal(new Set(agents.map(a=>a.id)).size,15);});
test("har bir agent uchun xavfsiz xabarlar tuziladi",()=>{for(const agent of registry.listAgents()){const messages=registry.buildMessages(agent.id,"MVP rejasini tuz");assert.equal(messages.length,2);assert.equal(messages[0].role,"system");assert.match(messages[1].content,/MVP rejasini tuz/);}});
test("noma’lum agent va bo‘sh vazifa rad etiladi",()=>{assert.equal(registry.getAgent("missing"),null);assert.throws(()=>registry.buildMessages("qa-agent",""),/bo‘sh/);});
test("har bir mutaxassis aniq scope va bajarilmagan ishni da’vo qilmaslik qoidasiga ega",()=>{for(const agent of registry.listAgents()){const value=registry.getAgent(agent.id);assert.ok(value.systemPrompt.length>200);assert.match(value.systemPrompt,/bajarilmagan|tekshir|mutaxassis/iu);}});
