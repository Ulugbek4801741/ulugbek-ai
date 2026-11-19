"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const provider=require("../modules/provider-router");
test("native Ollama endpoint config works without an API key",()=>{
 const config=provider.configuration({ULUGBEK_OLLAMA_URL:"http://127.0.0.1:11434",ULUGBEK_OLLAMA_MODEL:"qwen2.5:7b"});
 assert.equal(config.configured,true);assert.equal(config.provider,"ollama");assert.equal(config.local,true);assert.equal(config.apiKeyRequired,false);
});
test("native Ollama request uses /api/chat and non-streaming messages",()=>{
 const env={ULUGBEK_OLLAMA_URL:"http://ollama.internal:11434",ULUGBEK_OLLAMA_MODEL:"qwen2.5:7b"};
 const req=provider.request("Savol","System",env);const body=JSON.parse(req.options.body);
 assert.equal(req.url,"http://ollama.internal:11434/api/chat");assert.equal(body.model,"qwen2.5:7b");assert.equal(body.stream,false);
 assert.deepEqual(body.messages,[{role:"system",content:"System"},{role:"user",content:"Savol"}]);
});
test("Ollama token is optional and added only when configured",()=>{
 const a=provider.request("x","y",{ULUGBEK_OLLAMA_URL:"http://localhost:11434",ULUGBEK_OLLAMA_MODEL:"qwen"});
 assert.equal(a.options.headers.Authorization,undefined);
 const b=provider.request("x","y",{ULUGBEK_OLLAMA_URL:"http://localhost:11434",ULUGBEK_OLLAMA_MODEL:"qwen",ULUGBEK_OLLAMA_TOKEN:"secret"});
 assert.equal(b.options.headers.Authorization,"Bearer secret");
});
test("Ollama response extraction and invalid settings are handled",()=>{
 assert.equal(provider.extract({message:{content:"  Mahalliy javob  "}},"ollama"),"Mahalliy javob");
 assert.equal(provider.configuration({ULUGBEK_OLLAMA_URL:"file:///etc/passwd",ULUGBEK_OLLAMA_MODEL:"qwen"}).configured,false);
 assert.equal(provider.configuration({ULUGBEK_OLLAMA_URL:"http://localhost:11434"}).configured,false);
});
