"use strict";
const fs=require("node:fs/promises"), path=require("node:path"), crypto=require("node:crypto");
const languageModule=require("./language-module");
const LANGUAGES=new Set(["uz","en","ru","tr","kk"]);
const SOURCE_HOSTS=new Set(["uz.wikipedia.org","en.wikipedia.org","ru.wikipedia.org"]);
const STOPWORDS={
 uz:new Set("va yoki ham bilan uchun bu shu bir men sen siz biz ular u nima qanday qachon qayerda kim haqida orqali esa edi bor yoq emas mumkin kerak".split(" ")),
 en:new Set("the a an and or but if then with for from into about this that these those is are was were be been being to of in on at by as it its i you we they he she".split(" ")),
 ru:new Set("и или но если то с со для от из в на о об это этот эта эти я ты вы мы они он она что как где когда кто не ни да".split(" "))
};
const SUFFIXES={
 uz:["laringiz","larimiz","laring","larning","lardan","larga","larni","larda","imiz","ingiz","ning","dan","gan","dagi","lik","chi","lar","ni","ga","da","mi","ku"],
 en:["ingly","edly","ation","ments","ment","ness","ing","ers","ies","ed","es","er","ly","s"],
 ru:["иями","ями","ами","ого","ему","ыми","ими","ать","ять","ить","ение","ения","ов","ев","ам","ям","ах","ях","ый","ая","ое","ие","ы","и","а","я"]
};
const INTENT_RULES=[
 ["translate",/(?:tarjima qil|tarjima|translate|переведи|перевод)/iu],
 ["summarize",/(?:qisqacha|xulosa qil|xulosa|summari[sz]e|summary|кратко|резюме)/iu],
 ["compare",/(?:taqqosla|solishtir|farqi|qiyosla|compare|difference|сравни|разница)/iu],
 ["create",/(?:yaratib ber|tuzib ber|yozib ber|rasm chiz|create|write|design|составь|создай|напиши)/iu],
 ["troubleshoot",/(?:xato|ishlamayapti|tuzat|muammo|error|broken|fix|debug|ошибка|не работает|исправь)/iu],
 ["calculate",/(?:hisobla|necha foiz|qancha bo'ladi|calculate|сколько будет)/iu],
 ["explain",/(?:tushuntir|izohla|ma'nosi|nimani anglatadi|explain|meaning|объясни|значит)/iu],
 ["plan",/(?:reja tuz|rejalashtir|qadamlar|plan|roadmap|план)/iu],
 ["search",/(?:topib ber|izlab ber|qidir|latest|find|search|найди|поищи)/iu],
 ["code",/(?:kod yoz|dastur yoz|program|code|javascript|python|api|функци|код)/iu]
];
const DATA_DIR=path.resolve(process.env.ULUGBEK_DATA_DIR||path.join(__dirname,"..","data"));
const MAX_CORPUS_SOURCES=1200, MAX_SENTENCES=30000, MAX_TOKENS=300000, MAX_NGRAMS=90000;
function normalizeText(value){return String(value||"").normalize("NFC").toLocaleLowerCase().replace(/[’‘ʻʼ]/g,"'").replace(/\s+/g," ").trim();}
function tokenize(value){return normalizeText(value).match(/[\p{L}\p{M}\p{N}]+(?:'[\p{L}\p{M}\p{N}]+)*/gu)||[];}
function splitSentences(value){return String(value||"").replace(/\r/g,"").split(/(?<=[.!?。！？])\s+|\n+/u).map(x=>x.trim()).filter(x=>x.length>=20&&x.length<=1200);}
function detectLanguage(value,hint){
 if(LANGUAGES.has(hint)){const d=languageModule.detectLanguage(value);return {...d,code:hint,confidence:Math.max(.7,d.confidence),source:"corpus-metadata"};}
 return languageModule.detectLanguage(value);
}
function stemToken(token,language){
 const word=normalizeText(token), suffixes=[...(SUFFIXES[language]||[])].sort((a,b)=>b.length-a.length);
 for(const suffix of suffixes)if(word.length-suffix.length>=3&&word.endsWith(suffix))return word.slice(0,-suffix.length);
 return word;
}
function countInto(map,key,limit=MAX_NGRAMS){if(!map.has(key)&&map.size>=limit)return;map.set(key,(map.get(key)||0)+1);}
function hashIndex(value){return crypto.createHash("sha1").update(value).digest().readUInt32BE(0);}
function trustedSource(value){
 try{const u=new URL(String(value||""));return u.protocol==="https:"&&SOURCE_HOSTS.has(u.hostname)&&u.pathname.startsWith("/wiki/")&&!u.username&&!u.password;}
 catch(_){return false;}
}
function intentOf(text){for(const [intent,pattern] of INTENT_RULES)if(pattern.test(text))return{intent,confidence:.82};if(/[?؟]/u.test(text))return{intent:"question",confidence:.72};return{intent:"general",confidence:.48};}
function extractEntities(text){
 const result=[], pattern=/(?:^|[.!?]\s+)([A-ZА-ЯЁЎҚҒҲІҢҮҰӨҺ][\p{L}\p{M}'’-]{2,}(?:\s+[A-ZА-ЯЁЎҚҒҲІҢҮҰӨҺ][\p{L}\p{M}'’-]{2,}){0,2})/gu;
 let match;while((match=pattern.exec(String(text||"")))&&result.length<8){const v=match[1].trim();if(!result.includes(v))result.push(v);}
 const numbers=String(text||"").match(/\b\d+(?:[.,]\d+)?%?\b/gu)||[];for(const v of numbers.slice(0,8))if(!result.includes(v))result.push(v);return result;
}
function makePlan(intent,terms,evidenceCount){
 const steps=["So‘rov tilini, yozuvini va asosiy tushunchalarini aniqlash","Foydalanuvchining maqsadi va so‘rov turini belgilash"];
 if(["question","search","compare","explain","troubleshoot"].includes(intent)){steps.push("Mavjud bilim kutubxonasi va ruxsatli ochiq manbalardan dalil izlash","Manbalar, sanalar va dalillar mosligini tekshirish");}
 if(intent==="compare")steps.push("O‘xshash va farqli jihatlarni bir xil mezonlar bilan solishtirish");
 if(intent==="troubleshoot")steps.push("Sabablarni ehtimoliylik bo‘yicha tartiblash va xavfsiz sinov rejasini tuzish");
 if(intent==="translate")steps.push("Ma’no, ism, raqam va uslubni saqlagan holda tarjima qilish");
 if(["create","plan","code"].includes(intent))steps.push("Talablarni kichik, tekshiriladigan bosqichlarga ajratish");
 steps.push(evidenceCount?"Topilgan dalillarga tayangan holda xulosa chiqarish":"Dalil yetishmasa, noaniqlikni aytish yoki aniqlashtirish so‘rash");
 return{steps,evidenceAvailable:evidenceCount>0,topicTerms:terms.slice(0,12)};
}
function createLanguageCognition(options={}){
 const dataDir=path.resolve(options.dataDir||DATA_DIR), corpusFile=path.join(dataDir,"language-cognition-corpus.json"), modelFile=path.join(dataDir,"language-cognition-model.json");
 let model=null, writeQueue=Promise.resolve();
 async function readJson(file,fallback){try{return JSON.parse(await fs.readFile(file,"utf8"));}catch(e){if(e.code==="ENOENT")return fallback;throw e;}}
 async function atomicWrite(file,value){
  writeQueue=writeQueue.catch(()=>{}).then(async()=>{await fs.mkdir(dataDir,{recursive:true});const temp=file+".tmp";await fs.writeFile(temp,JSON.stringify(value),{mode:0o600});await fs.rename(temp,file);});
  return writeQueue;
 }
 async function initialize(){model=await readJson(modelFile,null);return status();}
 function languageStats(sentences){
  const unigram=new Map(),bigram=new Map(),trigram=new Map(),docFreq=new Map(),validation=[],trainSentences=[];
  const vocabulary=new Set();let tokenCount=0;
  sentences.slice(0,MAX_SENTENCES).forEach(sentence=>{
   const tokens=tokenize(sentence.text).slice(0,300);if(tokens.length<3)return;tokens.forEach(t=>vocabulary.add(t));
   if(sentences.length>=10&&hashIndex(sentence.text)%5===0)validation.push(tokens);else trainSentences.push(tokens);
  });
  for(const tokens of trainSentences){
   const bounded=tokens.slice(0,Math.max(0,MAX_TOKENS-tokenCount));if(!bounded.length)break;tokenCount+=bounded.length;const seen=new Set();
   for(const token of bounded){countInto(unigram,token,40000);if(!seen.has(token)){countInto(docFreq,token,40000);seen.add(token);}}
   const seq=["<s>",...bounded,"</s>"];
   for(let i=1;i<seq.length;i++)countInto(bigram,seq[i-1]+" "+seq[i]);
   for(let i=2;i<seq.length;i++)countInto(trigram,seq[i-2]+" "+seq[i-1]+" "+seq[i]);
  }
  const u=Object.fromEntries(unigram),b=Object.fromEntries(bigram),t=Object.fromEntries(trigram),df=Object.fromEntries(docFreq),vocab=Math.max(1,vocabulary.size);
  function entropy(samples,useTri){let total=0,loss=0;for(const tokens of samples){const seq=["<s>",...tokens,"</s>"];for(let i=1;i<seq.length;i++){
   const word=seq[i];let p;if(useTri&&i>=2){const prefix=seq[i-2]+" "+seq[i-1];p=((t[prefix+" "+word]||0)+.1)/((b[prefix]||0)+.1*vocab);}
   else p=((u[word]||0)+.1)/(tokenCount+.1*vocab);loss-=Math.log(Math.max(p,1e-12));total++;
  }}return total?Number((loss/total).toFixed(4)):null;}
  const unigramLoss=entropy(validation,false),trigramLoss=entropy(validation,true);
  return{tokenCount,sentenceCount:trainSentences.length,vocabularySize:vocabulary.size,unigram:u,bigram:b,trigram:t,documentFrequency:df,topWords:[...unigram].sort((a,b)=>b[1]-a[1]).slice(0,100),
   validation:{heldOutSentences:validation.length,unigramCrossEntropy:unigramLoss,trigramCrossEntropy:trigramLoss,trigramImproved:unigramLoss!==null&&trigramLoss!==null&&trigramLoss<unigramLoss},
   suggestionsReady:tokenCount>=100&&trainSentences.length>=8};
 }
 async function trainFromEntries(entries){
  const existing=await readJson(corpusFile,[]),corpus=Array.isArray(existing)?existing:[],known=new Set(corpus.map(x=>x.source)),additions=[];
  for(const entry of Array.isArray(entries)?entries:[]){
   if(!entry||!["pending-review","approved"].includes(entry.status)||!trustedSource(entry.source)||known.has(entry.source))continue;
   const text=String(entry.content||"").replace(/\s+/g," ").trim().slice(0,4000);if(text.length<80)continue;
   const detected=detectLanguage(text,entry.language),language=LANGUAGES.has(detected.code)?detected.code:"unknown";if(language==="unknown")continue;
   additions.push({id:crypto.randomUUID(),source:entry.source,title:String(entry.title||"Nomsiz manba").slice(0,180),language,text,sourceReviewStatus:entry.status,collectedAt:entry.createdAt||new Date().toISOString()});
   known.add(entry.source);if(corpus.length+additions.length>=MAX_CORPUS_SOURCES)break;
  }
  const next=[...corpus,...additions].slice(-MAX_CORPUS_SOURCES);if(additions.length)await atomicWrite(corpusFile,next);
  const all=[];for(const item of next){for(const sentence of splitSentences(item.text)){all.push({language:item.language,text:sentence});if(all.length>=MAX_SENTENCES)break;}if(all.length>=MAX_SENTENCES)break;}
  const languages={};for(const code of LANGUAGES){const rows=all.filter(x=>x.language===code);if(rows.length)languages[code]=languageStats(rows);}
  model={schemaVersion:1,modelType:"local-word-ngram-language-model",trainedAt:new Date().toISOString(),sourceCount:next.length,sentenceCount:all.length,languages,
   safety:"Public text is used only for statistical language patterns; pending facts are never auto-approved for factual chat answers.",neuralWeightsTrained:false};
  await atomicWrite(modelFile,model);
  return{addedSources:additions.length,corpusSources:next.length,sentences:all.length,languages:Object.keys(languages),modelType:model.modelType,neuralWeightsTrained:false,
   validation:Object.fromEntries(Object.entries(languages).map(([code,data])=>[code,data.validation]))};
 }
 function concepts(text,language){
  const stop=STOPWORDS[language]||new Set(),seen=new Set(),stats=model?.languages?.[language];
  return tokenize(text).map(t=>stemToken(t,language)).filter(t=>t.length>2&&!stop.has(t)).filter(t=>!seen.has(t)&&seen.add(t))
   .map(term=>({term,frequency:stats?.unigram?.[term]||0,documentFrequency:stats?.documentFrequency?.[term]||0}))
   .sort((a,b)=>(a.documentFrequency||0)-(b.documentFrequency||0)).slice(0,20);
 }
 function scoreText(query,text,languageHint){
  const detected=detectLanguage(query,languageHint),language=LANGUAGES.has(detected.code)?detected.code:"uz",q=concepts(query,language),target=new Set(tokenize(text).map(t=>stemToken(t,language)));
  if(!q.length||!target.size)return{score:0,matchedTerms:[]};
  const total=Math.max(1,model?.languages?.[language]?.sentenceCount||1),matched=q.filter(x=>target.has(x.term));
  const weighted=matched.reduce((sum,x)=>sum+(Math.log(1+total/(1+(x.documentFrequency||0)))||1),0);
  return{score:Number((weighted/Math.max(1,q.length)).toFixed(4)),matchedTerms:matched.map(x=>x.term),queryTerms:q.map(x=>x.term)};
 }
 function suggestNextWords(prefix,languageHint){
  const detected=detectLanguage(prefix,languageHint),language=LANGUAGES.has(detected.code)?detected.code:"uz",stats=model?.languages?.[language];if(!stats?.suggestionsReady)return[];
  const tokens=tokenize(prefix);if(!tokens.length)return[];const last=tokens[tokens.length-1],previous=tokens.length>1?tokens[tokens.length-2]:"<s>";
  const triPrefix=previous+" "+last+" ",biPrefix=last+" ";
  let list=Object.entries(stats.trigram||{}).filter(([k])=>k.startsWith(triPrefix)).map(([k,count])=>({word:k.slice(triPrefix.length),count,source:"trigram"}));
  if(!list.length)list=Object.entries(stats.bigram||{}).filter(([k])=>k.startsWith(biPrefix)).map(([k,count])=>({word:k.slice(biPrefix.length),count,source:"bigram"}));
  return list.sort((a,b)=>b.count-a.count).slice(0,5);
 }
 function analyze(text){
  const input=String(text||"").trim().slice(0,4000),language=detectLanguage(input),code=LANGUAGES.has(language.code)?language.code:"uz",tokens=tokenize(input),terms=concepts(input,code).map(x=>x.term),intent=intentOf(input),sentences=splitSentences(input);
  const negation=/(?:\bemas\b|\byo'q\b|\bnot\b|\bnever\b|\bno\b|\bне\b|\bнет\b)/iu.test(input),question=/[?؟]/u.test(input)||/^(nima|qanday|qachon|qayer|kim|why|what|how|when|where|who|что|как|когда|где|кто)\b/iu.test(input);
  return{language,intent:intent.intent,intentConfidence:intent.confidence,structure:{tokenCount:tokens.length,sentenceCount:Math.max(1,sentences.length),question,negation,entities:extractEntities(input)},concepts:terms,plan:makePlan(intent.intent,terms,0),
   learnedLanguage:{ready:Boolean(model?.languages?.[code]?.suggestionsReady),corpusSources:model?.sourceCount||0,vocabularySize:model?.languages?.[code]?.vocabularySize||0,nextWordSuggestions:suggestNextWords(input,code)},
   limits:"Bu statistik til tahlili; to‘liq semantik tushunish yoki inson tafakkuri emas."};
 }
 function rankEvidence(query,entries){return(Array.isArray(entries)?entries:[]).map(entry=>{const score=scoreText(query,String(entry.title||"")+" "+String(entry.content||""),entry.language);return{...entry,languageScore:score.score,matchedLanguageTerms:score.matchedTerms};}).sort((a,b)=>b.languageScore-a.languageScore);}
 function status(){
  const languages=model?.languages||{},trained=Boolean(model?.sourceCount>0&&model?.sentenceCount>0);return{ready:true,module:"ulugbek-independent-language-cognition",modelType:trained?model.modelType:"not-trained-yet",modelTrained:trained,trainingMode:"incremental-local-word-ngram-from-allowlisted-public-corpus",
   selfTrainingEnabled:true,internetSourceWorker:"lab-learning-worker",corpusSources:model?.sourceCount||0,sentenceCount:model?.sentenceCount||0,
   languages:Object.fromEntries(Object.entries(languages).map(([code,d])=>[code,{vocabularySize:d.vocabularySize,tokenCount:d.tokenCount,sentenceCount:d.sentenceCount,predictionReady:d.suggestionsReady,validation:d.validation}])),
   neuralWeightsTrained:false,factualAutoApproval:false,persistence:"server-side-json-atomic-write",dataDirectory:path.basename(dataDir)};
 }
 return{initialize,trainFromEntries,analyze,concepts,scoreText,rankEvidence,suggestNextWords,status};
}
const defaultEngine=createLanguageCognition();
module.exports={createLanguageCognition,tokenize,splitSentences,stemToken,trustedSource,intentOf,...defaultEngine};
