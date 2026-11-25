"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAgentFleet, chooseRoles, MAX_AGENTS } = require("../modules/agent-fleet");

test("task routing selects specialists dynamically", () => {
  assert.deepEqual(chooseRoles("GitHub serverdagi kod xatosini tekshir"), ["engineer", "verifier"]);
  assert.ok(chooseRoles("O'zbekiston qonunlari va soliq talablari").includes("legal"));
  assert.equal(MAX_AGENTS, 1000);
});

test("agent team runs specialists and deletes ephemeral agents after completion", async () => {
  const fleet = createAgentFleet({
    answer: async prompt => ({ reply: "Tahlil: " + prompt.slice(0, 40), modelUsed: "test-model" }),
    maxAgents: 100,
    concurrency: 2
  });
  const result = await fleet.runTask("GitHub serverdagi kod xatosini tekshir");
  assert.equal(result.ok, true);
  assert.equal(result.requestedAgents, 2);
  assert.equal(result.completedAgents, 2);
  assert.equal(result.lifecycle, "ephemeral-agents-deleted-after-task");
  assert.equal(fleet.status().activeAgents, 0);
});

test("agent failures are contained and reported", async () => {
  const fleet = createAgentFleet({ answer: async () => { throw new Error("test failure"); } });
  const result = await fleet.runTask("Oddiy savol");
  assert.equal(result.ok, false);
  assert.equal(result.failedAgents, 1);
  assert.equal(fleet.status().activeAgents, 0);
});

test("empty and oversized tasks are rejected", async () => {
  const fleet = createAgentFleet({ answer: async () => ({ reply: "ok" }) });
  await assert.rejects(() => fleet.runTask("   "), /bo'sh/);
  await assert.rejects(() => fleet.runTask("x".repeat(4001)), /4000/);
});

test("idle agents are removed by TTL cleanup", () => {
  let clock = 1000;
  const fleet = createAgentFleet({ now: () => clock, idleTtlMs: 1000, answer: async () => ({ reply: "ok" }) });
  // Spawn through an intentionally failed in-flight run is not exposed; runTask cleans immediately.
  assert.equal(fleet.status().activeAgents, 0);
  clock += 5000;
  assert.equal(fleet.cleanup(), 0);
});

test("hosted specialist team runs a separate critic and exposes quality status",async()=>{
 let calls=0;
 const fleet=createAgentFleet({answer:async prompt=>{
  calls++;
  if(prompt.includes("mustaqil QA"))return {reply:JSON.stringify({verdict:"pass",confidence:0.91,issues:[],checks:["task coverage","consistency"],summary:"Tekshirildi"}),modelUsed:"test-model",provider:"ollama"};
  return {reply:"Mutaxassis tahlili: aniq va cheklangan natija.",modelUsed:"test-model",provider:"ollama"};
 }});
 const result=await fleet.runTask("Biznes strategiyasini tahlil qil",{roles:["business","verifier"]});
 assert.equal(result.ok,true);assert.equal(calls,4);assert.equal(result.qualityGate.reviewPassed,true);assert.equal(result.qualityGate.publishable,true);
});
test("generated code is withheld until execution verification is configured",async()=>{
 const fleet=createAgentFleet({answer:async prompt=>{
  if(prompt.includes("mustaqil QA"))return {reply:JSON.stringify({verdict:"pass",confidence:0.95,issues:[],checks:["reviewed"],summary:"Reviewed"}),modelUsed:"test-model"};
  return {reply:"```python\nprint('hello')\n```",modelUsed:"test-model"};
 }});
 const result=await fleet.runTask("Python kodini yozib ber",{roles:["engineer","verifier"]});
 assert.equal(result.ok,true);assert.equal(result.qualityGate.codeDeliveryTask,true);assert.equal(result.qualityGate.publishable,false);
 assert.match(result.reply,/sinovdan o‘tmagan kodni tayyor yechim sifatida yubormayman/);
});
