"use strict";
const RULES = [
 ["legal", /(?:qonun|qonuniy|huquq|shartnoma|sud|soliq|litsenziya|mehnat kodeksi|legal|law|contract)/iu],
 ["research", /(?:qidir(?:ib)?|izla(?:b)?|top(?:ib)? ber|manba|havola|ssilka|internet|tadqiq|yangilik|bugun|hozir|so.nggi|latest|current|find|search|research|vakans|ish top)/iu],
 ["coding", /(?:kod|dastur|program|debug|xato|bug|github|repo|android|apk|sayt|web.?app|api|server|render|deploy|python|javascript|kotlin|frontend|backend|interfeys|css|html)/iu],
 ["translation", /(?:tarjima|translate|translation|inglizchaga|ruschaga|o.zbekchaga|tilga o.gir)/iu],
 ["document", /(?:hujjat|pdf|docx|word|excel|xlsx|hisobot|rezyume|resume|ariza|taqdimot|pptx)/iu],
 ["business", /(?:biznes|savdo|bozor|mijoz|daromad|xarajat|marketing|kompaniya|startap|business|sales)/iu],
 ["education", /(?:o.rgan|dars|ta.lim|kurs|tushuntir|misol bilan|mashq|lesson|teach|learn)/iu],
 ["creative", /(?:yozib ber|she.r|hikoya|ssenariy|post|reklama matni|g.oya|design|dizayn|logo|ijodiy|creative)/iu],
 ["math", /(?:hisobla|matematika|formula|tenglama|foiz|percentage|calculate|\d\s*[+*\\/×÷-]\s*\d)/iu]
];
const ROLE_MAP = Object.freeze({
 legal:["legal-agent","research-agent","security-agent","qa-agent"],
 research:["research-agent","analyst","verifier","qa-agent"],
 coding:["software-builder-agent","backend-agent","qa-agent","security-agent"],
 translation:["translator-agent","qa-agent"],
 document:["document-agent","qa-agent"],
 business:["product-growth-agent","research-agent","analyst","data-analyst-agent"],
 education:["educator-agent","core-architect"],
 creative:["product-growth-agent","chat-coordinator"],
 math:["data-analyst-agent","qa-agent"],
 conversation:["generalist","chat-coordinator"],
 general:["generalist","chat-coordinator","core-architect"]
});
function cleanTask(value){return String(value||"").replace(/\s+/g," ").trim().slice(0,4000);}
function route(value){
 const task=cleanTask(value), text=task.toLocaleLowerCase("uz");
 const current=/(?:bugun|bugungi|hozir|ayni paytda|so.nggi|joriy|today|right now|current|latest|202[5-9])/iu.test(text);
 const explicitSearch=/(?:qidir|izla|topib ber|manba|havola|internetdan|tadqiq|search|find|look up|research)/iu.test(text);
 let category="general";
 if(/^(?:salom|assalomu alaykum|rahmat|hello|hi|xayr)[!.?\s]*$/iu.test(text)) category="conversation";
 else {const match=RULES.find(([,pattern])=>pattern.test(text));if(match)category=match[0];}
 const needsWebResearch=Boolean(task)&&(current||explicitSearch||category==="research"||category==="legal"||
  (category==="business"&&/(?:bozor|raqobatchi|narx|trend|mijozlar|market|competitor)/iu.test(text))||
  (category==="general"&&/[?？]/u.test(text)));
 let roles=[...(ROLE_MAP[category]||ROLE_MAP.general)];
 if(category==="coding" && /(?:frontend|interfeys|dizayn|css|html)/iu.test(text)) roles=["software-builder-agent","frontend-agent","qa-agent","security-agent"];
 if(category==="coding" && /(?:backend|api|server|database|ma.lumotlar bazasi)/iu.test(text)) roles=["software-builder-agent","backend-agent","qa-agent","security-agent"];
 if(category==="coding" && /(?:deploy|render|hosting|serverga joyla)/iu.test(text)) roles=["software-builder-agent","backend-agent","devops-agent","qa-agent"];
 if(/(?:xavfsiz|himoya|parol|maxfiy|security|hujum|ruxsat)/iu.test(text) && !roles.includes("security-agent")) roles.splice(Math.max(0,roles.length-1),0,"security-agent");
 if(needsWebResearch&&!roles.includes("research-agent"))roles.unshift("research-agent");
 if(needsWebResearch&&!roles.includes("verifier"))roles.push("verifier");
 roles=[...new Set(roles)].slice(0,5);
 return {category,roles,needsWebResearch,current,explicitSearch};
}
module.exports={route,cleanTask,ROLE_MAP};
