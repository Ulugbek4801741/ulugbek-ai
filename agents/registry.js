"use strict";
const agents = [
 require("./chat-coordinator"), require("./core-architect"), require("./research-agent"),
 require("./software-builder-agent"), require("./frontend-agent"), require("./backend-agent"),
 require("./qa-agent"), require("./security-agent"), require("./devops-agent"), require("./product-growth-agent")
];
const byId = new Map(agents.map(agent => [agent.id, agent]));
function listAgents() { return agents.map(({id,name,specialty}) => ({id,name,specialty})); }
function getAgent(id) { return byId.get(id) || null; }
function buildMessages(id, task, context="") {
 const agent=getAgent(id);
 if (!agent) throw new Error("Noma’lum agent: "+id);
 if (typeof task!=="string" || !task.trim()) throw new TypeError("Vazifa matni bo‘sh.");
 if (task.length>4000) throw new RangeError("Vazifa 4000 belgidan oshmasligi kerak.");
 return [{role:"system",content:agent.systemPrompt},{role:"user",content:"Vazifa:\n"+task.trim()+(context?"\n\nKontekst:\n"+String(context).slice(0,6000):"")}];
}
module.exports={listAgents,getAgent,buildMessages};
