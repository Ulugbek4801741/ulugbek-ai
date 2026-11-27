(()=>{"use strict";
const menu=document.getElementById("mini-menu");
if(!menu||document.getElementById("ai-connect-entry"))return;
const entry=document.createElement("button");entry.id="ai-connect-entry";entry.type="button";entry.textContent="🔌 AI ulash";
menu.insertBefore(entry,menu.children[1]||null);
const modal=document.createElement("div");modal.id="ai-connect-modal";modal.className="ai-connect-backdrop";modal.hidden=true;
modal.innerHTML='<section class="ai-connect-panel" role="dialog" aria-modal="true" aria-labelledby="ai-connect-title"><header><div><h2 id="ai-connect-title">AI xizmatlarini ulash</h2><p>ULUGBEK AI · doimiy OpenAI ulanishi</p></div><button type="button" class="ai-connect-close" aria-label="Yopish">×</button></header><article class="ai-provider ai-primary"><div class="ai-provider-head"><span class="ai-logo">◎</span><div><h3>ChatGPT (OpenAI)</h3><small>Asosiy AI provayderi</small></div><span class="ai-tag" id="ai-status-tag">Tekshirilmoqda…</span></div><div class="ai-status-box" id="ai-status-box" role="status" aria-live="polite">Server holati tekshirilmoqda…</div><div class="ai-actions"><button type="button" class="ai-action-primary" id="ai-test-button">Ulanishni sinash</button><button type="button" class="ai-action-secondary" id="ai-refresh-button">Holatni yangilash</button></div><p class="ai-connect-note">Kalitni ULUGBEK AI oynasiga kiritmang. Uni faqat Render serverining maxfiy Environment sozlamasida saqlang.</p><a class="ai-connect-link" href="https://dashboard.render.com/web/srv-dbicaf8u01pc73995su0" target="_blank" rel="noopener noreferrer">Render server sozlamalarini ochish ↗</a><a class="ai-connect-link ai-openai-link" href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI API kalitlarini boshqarish ↗</a><div class="ai-env"><b>Render’da bir marta sozlanadigan qiymatlar</b><code>ULUGBEK_AI_PROVIDER = openai-compatible</code><code>OPENAI_BASE_URL = https://api.openai.com/v1</code><code>OPENAI_MODEL = gpt-4.1-mini</code><code>OPENAI_API_KEY = yangi maxfiy kalit</code></div><button type="button" class="ai-copy-env">Sozlama nomlarini nusxalash</button><p class="ai-warning">OpenAI API alohida to‘lov asosida ishlaydi. OpenAI hisobida xarajat limitini belgilang. ChatGPT obunasi API kreditini bermaydi.</p></article><div class="ai-provider-list"><div><b>Ulanish qanday ishlaydi?</b><span>Kalit Render’da saqlanadi. ULUGBEK AI har safar server orqali foydalanadi; kalit brauzerga yuborilmaydi.</span></div></div></section>';
document.body.appendChild(modal);
const statusBox=modal.querySelector("#ai-status-box"),tag=modal.querySelector("#ai-status-tag"),testButton=modal.querySelector("#ai-test-button"),refreshButton=modal.querySelector("#ai-refresh-button");
const close=()=>{modal.hidden=true;};
async function refreshStatus(){
 statusBox.textContent="Server holati tekshirilmoqda…";tag.textContent="Tekshirilmoqda…";
 try{
  const response=await fetch("/api/ai/status",{cache:"no-store",credentials:"same-origin"});
  if(!response.ok)throw new Error("Server holati olinmadi ("+response.status+").");
  const data=await response.json(),model=data.model||{},configured=model.configured===true;
  tag.textContent=configured?"Sozlangan":"Ulanmagan";tag.className=configured?"ai-tag ai-tag-ok":"ai-tag ai-tag-off";
  const provider=model.provider||"aniqlanmagan",name=model.model||"model tanlanmagan";
  let detail=configured?"OpenAI provayder sozlamasi mavjud.":"OpenAI hali to‘liq sozlanmagan.";
  if(model.reason==="api-key-missing")detail="API kaliti topilmadi. Render Environment’da OPENAI_API_KEY qiymatini qo‘shing.";
  else if(model.reason==="model-name-missing")detail="Model nomi ko‘rsatilmagan. OPENAI_MODEL qiymatini tekshiring.";
  else if(model.reason==="endpoint-invalid")detail="API manzili noto‘g‘ri. OPENAI_BASE_URL qiymatini tekshiring.";
  statusBox.textContent=detail+"\nProvayder: "+provider+" · Model: "+name+"\nKalit qiymati xavfsizlik uchun ko‘rsatilmaydi.";
  testButton.disabled=!configured;
 }catch(error){tag.textContent="Tekshirilmadi";tag.className="ai-tag ai-tag-off";statusBox.textContent=error.message;testButton.disabled=true;}
}
entry.addEventListener("click",e=>{e.stopPropagation();menu.hidden=true;modal.hidden=false;refreshStatus();});
modal.querySelector(".ai-connect-close").addEventListener("click",close);
modal.addEventListener("click",e=>{if(e.target===modal)close();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modal.hidden)close();});
refreshButton.addEventListener("click",refreshStatus);
testButton.addEventListener("click",async()=>{
 testButton.disabled=true;testButton.textContent="Sinov yuborilmoqda…";statusBox.textContent="OpenAI serveridan javob kutilmoqda…";
 try{
  const response=await fetch("/api/ai/test",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:"{}"});
  const data=await response.json();
  if(!response.ok||data.ok!==true)throw new Error(data.error||"Ulanish sinovi muvaffaqiyatsiz.");
  statusBox.textContent="Muvaffaqiyatli ulandi! OpenAI javobi olindi. Model: "+(data.model||"noma’lum")+" · "+(data.latencyMs||0)+" ms.";
  tag.textContent="Ishlayapti";tag.className="ai-tag ai-tag-ok";
 }catch(error){statusBox.textContent="Sinov xatosi: "+error.message;tag.textContent="Sinov xatosi";tag.className="ai-tag ai-tag-off";}
 finally{testButton.textContent="Ulanishni sinash";testButton.disabled=false;}
});
modal.querySelector(".ai-copy-env").addEventListener("click",async()=>{
 const value="ULUGBEK_AI_PROVIDER=openai-compatible\nOPENAI_BASE_URL=https://api.openai.com/v1\nOPENAI_MODEL=gpt-4.1-mini\nOPENAI_API_KEY= (yangi maxfiy kalitni Render’da kiriting)";
 const button=modal.querySelector(".ai-copy-env");
 try{await navigator.clipboard.writeText(value);button.textContent="Nusxalandi ✓";}
 catch(_){statusBox.textContent=value;}
 setTimeout(()=>button.textContent="Sozlama nomlarini nusxalash",1800);
});
})();