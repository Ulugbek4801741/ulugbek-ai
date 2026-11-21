"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {diagnose}=require("../modules/diagnostic-99-agents");
test("assigns 99 specialist profiles without claiming 99 model processes",async()=>{const r=await diagnose();assert.equal(r.agents.assigned,99);assert.equal(r.agents.independentModelProcesses,0);});
test("diagnostic is explicitly read-only",async()=>{const r=await diagnose();assert.equal(r.mode,"read-only-static-diagnostics");assert.ok(r.limits.some(x=>x.includes("Hech qanday fayl")));});
test("reports source and test inventory",async()=>{const r=await diagnose();assert.ok(r.inventory.filesScanned>0);assert.ok(Array.isArray(r.inventory.tests));});
