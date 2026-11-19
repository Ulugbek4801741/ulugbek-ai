"use strict";
const RULES = [
 ["legal", /(?:qonun|qonuniy|huquq|shartnoma|sud|soliq|litsenziya|mehnat kodeksi|legal|law|contract)/iu],
 ["research", /(?:qidir(?:ib)?|izla(?:b)?|top(?:ib)? ber|manba|havola|ssilka|internet|tadqiq|yangilik|bugun|hozir|so.nggi|latest|current|find|search|research|vakans|ish top)/iu],
 ["coding", /(?:kod|dastur|program|debug|xato|bug|github|repo|android|apk|sayt|web.?app|api|server|render|deploy|python|javascript|kotlin)/iu],
 ["translation", /(?:tarjima|translate|translation|inglizchaga|ruschaga|o.zbekchaga|tilga o.gir)/iu],
 ["document", /(?:hujjat|pdf|docx|word|excel|xlsx|hisobot|rezyume|resume|ariza|taqdimot|pptx)/iu],
 ["business", /(?:biznes|savdo|bozor|mijoz|daromad|xarajat|marketing|kompaniya|startap|business|sales)/iu],
 ["education", /(?:o.rgan|dars|ta.lim|kurs|tushuntir|misol bilan|mashq|lesson|teach|learn)/iu],
 ["creative", /(?:yozib ber|she.r|hikoya|ssenariy|post|reklama matni|g.oya|design|dizayn|logo|ijodiy|creative)/iu],
 ["math", /(?:hisobla|matematika|formula|tenglama|foiz|percentage|calculate|\d\s*[+*/×÷-]\s*\d)/iu]
];
const ROLE_MAP = Object.freeze({
 legal:["legal","researcher","verifier"], research:["researcher","analyst","verifier"],
 coding:["engineer","analyst","verifier"], translation:["translator","verifier"],
 document:["documenter","analyst","verifier"], business:["business","analyst","researcher"],
 education:["educator","generalist"], creative:["creative","generalist"],
 math:["dataAnalyst","verifier"], conversation:["generalist"], general:["generalist","analyst"]
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
  (category==="general"&&/[?？]/u.test(task)));
 let roles=[...(ROLE_MAP[category]||ROLE_MAP.general)];
 if(needsWebResearch&&!roles.includes("researcher"))roles.unshift("researcher");
 if(needsWebResearch&&!roles.includes("verifier"))roles.push("verifier");
 roles=[...new Set(roles)].slice(0,4);
 return {category,roles,needsWebResearch,current,explicitSearch};
}
module.exports={route,cleanTask,ROLE_MAP};
