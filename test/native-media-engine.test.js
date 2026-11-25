"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {makeImage,makeVideo,makeVoice,palette}=require("../modules/native-media-engine");
test("native image generator creates an SVG asset without a provider key",()=>{
 const result=makeImage("sunset over mountain village",{style:"cinematic"});
 assert.equal(result.mimeType,"image/svg+xml");
 const svg=Buffer.from(result.image,"base64").toString("utf8");
 assert.match(svg,/<svg/);assert.match(svg,/mountain village/);assert.match(result.notice,/Diffusion\/rasm AI model emas/);
});
test("native animated scene is valid SVG with animation tags",()=>{
 const result=makeVideo("space and stars");
 const svg=Buffer.from(result.video,"base64").toString("utf8");
 assert.equal(result.mimeType,"image/svg+xml");assert.match(svg,/<animate/);assert.match(svg,/<svg/);
});
test("voice output splits sentences and supports Uzbek language",()=>{
 const result=makeVoice("Salom. Bugun yaxshi kun! Qanday yordam kerak?","uz-UZ");
 assert.equal(result.language,"uz-UZ");assert.deepEqual(result.segments,["Salom.","Bugun yaxshi kun!","Qanday yordam kerak?"]);
});
test("empty prompts are rejected",()=>{
 assert.throws(()=>makeImage(" "),error=>error.status===400);
 assert.throws(()=>makeVideo(""),error=>error.status===400);
 assert.throws(()=>makeVoice(""),error=>error.status===400);
});
