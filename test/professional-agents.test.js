"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const registry=require("../agents/registry");
const {route}=require("../modules/task-intent-router");
test("registry exposes fifteen distinct professional specialist roles",()=>{
 const agents=registry.listAgents();
 assert.equal(agents.length,15);
 assert.equal(new Set(agents.map(agent=>agent.id)).size,15);
 for(const id of ["translator-agent","legal-agent","educator-agent","document-agent","data-analyst-agent"]) assert.ok(registry.getAgent(id));
});
test("each new specialist has a scoped professional system prompt",()=>{
 for(const id of ["translator-agent","legal-agent","educator-agent","document-agent","data-analyst-agent"]){
  const agent=registry.getAgent(id);
  assert.ok(agent.systemPrompt.length>300);
  assert.match(agent.systemPrompt,/dalil|tekshir|mutaxassis/iu);
 }
});
test("task router only selects registered specialist ids for new domains",()=>{
 for(const prompt of ["Tarjima qil","Mehnat qonuni","Darsni tushuntir","PDF hisobot","Foizni hisobla"]){
  const result=route(prompt);
  for(const id of result.roles.filter(value=>value.endsWith("-agent"))) assert.ok(registry.getAgent(id),id);
 }
});
