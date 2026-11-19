"use strict";
function parseReview(value) {
  const raw=String(value||"").trim();
  const candidates=[raw,...(raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)||[]).slice(1)];
  for(const candidate of candidates){
    try{
      const data=JSON.parse(candidate);
      const verdict=String(data.verdict||"").toLowerCase();
      const confidence=Number(data.confidence);
      const issues=Array.isArray(data.issues)?data.issues.map(x=>String(x).slice(0,300)).slice(0,10):[];
      const checks=Array.isArray(data.checks)?data.checks.map(x=>String(x).slice(0,300)).slice(0,10):[];
      if(!["pass","revise","reject"].includes(verdict)||!Number.isFinite(confidence)||confidence<0||confidence>1)return null;
      return {verdict,confidence,issues,checks,summary:String(data.summary||"").slice(0,500)};
    }catch(_){}
  }
  return null;
}
function isCodeDeliveryTask(task) {
  const value=String(task||"");
  const code=/(?:kod|code|dastur|program|script|funksiya|function|api|backend|frontend)/iu.test(value);
  const action=/(?:yozib ber|yoz|yarat|tuz|qur|ishlab chiq|fix|debug|repair|implement|build|create|generate|refactor)/iu.test(value);
  return code&&action;
}
function evaluateReview(review) {
  if(!review)return {status:"review-unavailable",passed:false,reason:"Mustaqil tekshiruvchi aniq JSON natija bermadi."};
  const passed=review.verdict==="pass"&&review.confidence>=0.8&&review.issues.length===0&&review.checks.length>0;
  return {status:passed?"review-passed":"review-rejected",passed,confidence:review.confidence,issues:review.issues,checks:review.checks,summary:review.summary};
}
function buildReviewPrompt(task,draft,agents) {
  return [
    "Siz mustaqil QA va xavfsizlik nazoratchisisiz. Oldingi javobni maqtashga emas, xatolarni topishga harakat qiling.",
    "Foydalanuvchi vazifasi va mutaxassislar natijasiga moslikni tekshiring. Fakt, taxmin va noma’lum qismlarni ajrating.",
    "Kod bo‘lsa, test ishga tushirilganini ko‘rsatuvchi dalil bo‘lmasa hech qachon pass bermang. Faqat ko‘zdan kechirish bajarilgan bo‘lsa, verdict revise bo‘lsin.",
    "Yakuniy javob FAQAT JSON bo‘lsin: {\"verdict\":\"pass|revise|reject\",\"confidence\":0.0,\"issues\":[],\"checks\":[],\"summary\":\"...\"}.",
    "pass uchun confidence kamida 0.8, issues bo‘sh va checks ichida bajarilgan aniq tekshiruvlar bo‘lishi shart.",
    "Foydalanuvchi topshirig'i: "+String(task||"").slice(0,4000),
    "Mutaxassislar natijasi: "+(Array.isArray(agents)?agents.map(x=>"\n["+x.role+"] "+x.reply).join("\n"):""),
    "Tekshiriladigan yakuniy loyiha/javob:\n"+String(draft||"").slice(0,12000)
  ].join("\n\n");
}
module.exports={parseReview,isCodeDeliveryTask,evaluateReview,buildReviewPrompt};
