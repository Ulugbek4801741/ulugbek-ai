"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs/promises");
const os=require("node:os");
const path=require("node:path");
const {createLanguageCognition,tokenize,trustedSource}=require("../modules/language-cognition");

function sampleText(){
 return Array.from({length:18},(_,i)=>[
  "Til moduli mustaqil ravishda o‘rganadi va yangi so‘zlarni tahlil qiladi.",
  "Til moduli grammatik qoidalarni o‘rganadi va so‘zlar orasidagi bog‘lanishni kuzatadi.",
  "Har bir mashq raqami "+i+" yangi bilimni tekshiradi."
 ].join(" ")).join(" ");
}
async function temporaryEngine(t){
 const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),"ulugbek-language-"));
 const engine=createLanguageCognition({dataDir});
 t.after(async()=>fs.rm(dataDir,{recursive:true,force:true}));
 return engine;
}

test("tokenizer preserves Uzbek letters and apostrophe words",()=>{
 const tokens=tokenize("O‘zbekiston tili, o‘rganish va tafakkur!");
 assert.ok(tokens.includes("o'zbekiston"));
 assert.ok(tokens.includes("tafakkur"));
 assert.ok(tokens.includes("o'rganish"));
});
test("only allowlisted public encyclopedia sources enter the language corpus",async t=>{
 const engine=await temporaryEngine(t);
 assert.equal(trustedSource("https://uz.wikipedia.org/wiki/O%27zbek_tili"),true);
 assert.equal(trustedSource("https://example.org/wiki/Ozbek_tili"),false);
 const result=await engine.trainFromEntries([
  {title:"Til",content:sampleText(),source:"https://uz.wikipedia.org/wiki/Til",language:"uz",status:"pending-review"},
  {title:"Injected",content:sampleText(),source:"https://evil.example/wiki/Til",language:"uz",status:"approved"}
 ]);
 assert.equal(result.addedSources,1);
 assert.equal(result.corpusSources,1);
 assert.equal(engine.status().factualAutoApproval,false);
});
test("independent language model learns local n-grams and predicts next words",async t=>{
 const engine=await temporaryEngine(t);
 const result=await engine.trainFromEntries([
  {title:"O‘zbek tili",content:sampleText(),source:"https://uz.wikipedia.org/wiki/O%27zbek_tili",language:"uz",status:"pending-review"}
 ]);
 assert.equal(result.neuralWeightsTrained,false);
 assert.ok(result.sentences>=30);
 const status=engine.status();
 assert.equal(status.modelType,"local-word-ngram-language-model");
 assert.ok(status.languages.uz.vocabularySize>5);
 assert.ok(status.languages.uz.tokenCount>100);
 assert.ok(status.languages.uz.predictionReady);
 assert.ok(engine.suggestNextWords("til moduli","uz").some(item=>item.word==="mustaqil"));
});
test("language cognition identifies intent, concepts and a step-by-step reasoning plan",()=>{
 const engine=createLanguageCognition({dataDir:path.join(os.tmpdir(),"ulugbek-language-empty-"+process.pid)});
 const result=engine.analyze("Bu kodni tushuntirib ber, iltimos.");
 assert.equal(result.intent,"explain");
 assert.ok(result.concepts.includes("kodni")||result.concepts.includes("kod"));
 assert.ok(result.plan.steps.some(step=>step.includes("tilini")));
});
test("learned language scoring ranks relevant evidence and survives restart",async t=>{
 const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),"ulugbek-language-persist-"));
 t.after(async()=>fs.rm(dataDir,{recursive:true,force:true}));
 const first=createLanguageCognition({dataDir});
 await first.trainFromEntries([{title:"Til",content:sampleText(),source:"https://uz.wikipedia.org/wiki/Til",language:"uz",status:"approved"}]);
 const ranked=first.rankEvidence("til moduli grammatikasi",[
  {title:"Boshqa mavzu",content:"Daraxtlar va ob-havo haqida umumiy ma’lumot."},
  {title:"Til moduli",content:"Til moduli grammatik qoidalarni o‘rganadi va tahlil qiladi."}
 ]);
 assert.equal(ranked[0].title,"Til moduli");
 const second=createLanguageCognition({dataDir});
 await second.initialize();
 assert.equal(second.status().corpusSources,1);
 assert.equal(second.status().languages.uz.predictionReady,true);
});
