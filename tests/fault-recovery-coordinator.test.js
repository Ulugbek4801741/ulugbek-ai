"use strict";
const test=require("node:test"); const assert=require("node:assert/strict");
const {FaultRecoveryCoordinator}=require("../modules/fault-recovery-coordinator");
test("returns primary result when healthy",async()=>{const c=new FaultRecoveryCoordinator({backoffMs:0});const r=await c.execute("chat",async()=>42,async()=>0);assert.equal(r.ok,true);assert.equal(r.source,"primary");assert.equal(r.value,42);});
test("fallback agent pathway recovers primary failure",async()=>{const c=new FaultRecoveryCoordinator({maxAttempts:1,backoffMs:0});const r=await c.execute("chat",async()=>{throw Error("boom")},async()=>("fallback-ok"),async(_e,agents)=>({reviewedBy:agents.map(a=>a.id)}));assert.equal(r.ok,true);assert.equal(r.recovered,true);assert.equal(r.value,"fallback-ok");assert.ok(r.diagnosis);});
test("reports failure when both primary and fallback fail",async()=>{const c=new FaultRecoveryCoordinator({maxAttempts:1,backoffMs:0});const r=await c.execute("chat",async()=>{throw Error("primary")},async()=>{throw Error("fallback")});assert.equal(r.ok,false);assert.equal(r.repairSuggested,true);});
test("timeout prevents hung handler from blocking forever",async()=>{const c=new FaultRecoveryCoordinator({maxAttempts:1,timeoutMs:15,backoffMs:0});const r=await c.execute("slow",()=>new Promise(()=>{}),()=> "fallback");assert.equal(r.ok,true);assert.equal(r.value,"fallback");});
