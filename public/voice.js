"use strict";
const $ = (id) => document.getElementById(id);
const messages = $("messages"), status = $("status"), orb = $("orb");
const STORE = "ulugbek_voice_profile_v1", CHAT = "ulugbek_voice_chat_v1", SESSION = "ulugbek_voice_session_v1";\nlet sessionId = "";\ntry { sessionId = localStorage.getItem(SESSION) || ""; if (!/^[a-zA-Z0-9_-]{8,80}$/.test(sessionId)) { sessionId = (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : "voice" + Date.now().toString(36) + Math.random().toString(36).slice(2)); localStorage.setItem(SESSION, sessionId); } } catch (_) { sessionId = "voice" + Date.now().toString(36) + Math.random().toString(36).slice(2); }
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognizer = null, lastReply = "", objectUrl = "", micStream = null;
function setStatus(text){status.textContent=text;}
function apiUrl(path){
 const base=typeof window.ULUGBEK_API_BASE_URL==="string"?window.ULUGBEK_API_BASE_URL.trim().replace(/\/$/,""):"";
 if(!base)throw new Error("Backend manzili public/config.js faylida sozlanmagan.");
 return base+path;
}
function addMessage(text, role, save=true){
  const p=document.createElement("p"); p.className="bubble "+role; p.textContent=text; messages.append(p);
  if(save){try{const items=JSON.parse(localStorage.getItem(CHAT)||"[]");items.push({text,role});localStorage.setItem(CHAT,JSON.stringify(items.slice(-80)));}catch(_){}}
  p.scrollIntoView({block:"nearest",behavior:"smooth"});
}
function showHistory(){
  try{const items=JSON.parse(localStorage.getItem(CHAT)||"[]");items.forEach(x=>{if(x&&typeof x.text==="string"&&["user","assistant"].includes(x.role))addMessage(x.text,x.role,false);});}catch(_){}
  if(messages.children.length){$("welcome").hidden=true;}
}
function avatarName(){return $("name").value.trim()||"ULUGBEK AI";}
function saveProfile(){try{localStorage.setItem(STORE,JSON.stringify({name:$("name").value,lang:$("lang").value}));}catch(_){}}
function loadProfile(){try{const p=JSON.parse(localStorage.getItem(STORE)||"{}");if(typeof p.name==="string")$("name").value=p.name;if(typeof p.lang==="string"&&[...$("lang").options].some(o=>o.value===p.lang))$("lang").value=p.lang;}catch(_){} $("greeting").textContent="Salom! Men "+avatarName();}
async function requestMicPermission(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){$("permission-status").textContent="Bu brauzer mikrofon ruxsatini boshqarishni qo‘llamaydi. HTTPS orqali Chrome’da oching.";throw new Error("Mikrofon uchun HTTPS va mos brauzer kerak.");}
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});
  stream.getTracks().forEach(track=>track.stop());
  $("permission-status").textContent="Mikrofonga ruxsat berildi. Gapirish tugmasini bosing.";
  return true;
}
function speak(text){
  if(!("speechSynthesis" in window)){setStatus("Brauzer ovoz chiqarishni qo‘llamaydi.");return;}
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);u.lang=$("lang").value;u.rate=1;
  u.onstart=()=>orb.classList.add("speaking");u.onend=()=>orb.classList.remove("speaking");
  u.onerror=()=>{orb.classList.remove("speaking");setStatus("Ovoz chiqarilmadi; matn javobi mavjud.");};
  window.speechSynthesis.speak(u);
}
function tokens(s){return String(s||"").toLocaleLowerCase("uz").normalize("NFD").replace(/[\u0300-\u036f]/g,"").split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>2);}
async function knowledgeReply(question){
  try{
    const response=await fetch(apiUrl("/api/lab/knowledge"));
    if(!response.ok)return null;
    const data=await response.json();const entries=Array.isArray(data.entries)?data.entries:[];
    const q=tokens(question);if(!q.length)return null;
    const ranked=entries.map(e=>{const hay=tokens([e.title,e.content,e.agent].join(" "));const set=new Set(hay);return {e,score:q.reduce((n,w)=>n+(set.has(w)?1:0),0)};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
    if(!ranked.length)return null;
    return "Bilimlar bazasidan topilgan ma’lumot (moslik bo‘yicha):\n\n"+ranked.map((x,i)=>(i+1)+". "+x.e.title+"\n"+x.e.content+(x.e.source?"\nManba: "+x.e.source:"")).join("\n\n")+"\n\nEslatma: bu saqlangan yozuvlar bo‘yicha qidiruv; ma’lumotning yangiligi va to‘g‘riligini manbadan tekshiring.";
  }catch(_){return null;}
}
function localReply(text){
 const q=text.toLocaleLowerCase("uz");
 if(/salom|assalomu|hello|hi\b/.test(q))return "Salom! Men "+avatarName()+". Savolingizni yozishingiz yoki mikrofon orqali aytishingiz mumkin.";
 if(/isming|kimsan|who are you/.test(q))return "Mening nomim "+avatarName()+".";
 if(/vaqt|soat|time/.test(q))return "Qurilmangizdagi vaqt: "+new Date().toLocaleTimeString()+".";
 if(/sana|bugun|date/.test(q))return "Qurilmangizdagi sana: "+new Date().toLocaleDateString()+".";
 if(/rahmat|thanks/.test(q))return "Marhamat! Yana savolingiz bo‘lsa, yozing.";
 return "Bu savolga mahalliy bilimlar bazasidan aniq javob topilmadi. Bilim laboratoriyasida ishonchli manbalarni izlab, tekshirib saqlashingiz mumkin. Bu demo hozir katta til modeliga ulanmagan; men o‘zimni o‘qitdim deb da’vo qilmayman.";
}
async function send(text){
 const clean=text.trim();if(!clean)return;
 $("welcome").hidden=true;addMessage(clean,"user");$("message").value="";setStatus("Javob izlanmoqda…");
 let reply=null;
 try{
  const response=await fetch(apiUrl("/api/chat"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:clean,sessionId})});
  const data=await response.json();
  if(response.ok&&data.mode!=="demo"&&typeof data.reply==="string"&&data.reply.trim())reply=data.reply.trim();
 }catch(_){}
 if(!reply)reply=await knowledgeReply(clean);
 if(!reply)reply=localReply(clean);
 lastReply=reply;addMessage(reply,"assistant");setStatus("Javob tayyor");
 if(document.visibilityState!=="hidden")speak(reply);
}
$("form").addEventListener("submit",e=>{e.preventDefault();send($("message").value);});
$("name").addEventListener("input",()=>{$("greeting").textContent="Salom! Men "+avatarName();saveProfile();});
$("lang").addEventListener("change",saveProfile);
$("profile-open").addEventListener("click",()=>{$("profile-drawer").hidden=!$("profile-drawer").hidden;});
$("profile-close").addEventListener("click",()=>$("profile-drawer").hidden=true);
$("permission").addEventListener("click",async()=>{try{await requestMicPermission();}catch(e){$("permission-status").textContent=e.message||"Mikrofonga ruxsat berilmadi.";setStatus("Mikrofon ruxsati kerak");}});
$("image").addEventListener("change",()=>{
 const file=$("image").files&&$("image").files[0];if(!file)return;
 if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>5*1024*1024){setStatus("PNG, JPG yoki WebP rasm 5 MB gacha bo‘lishi kerak.");$("image").value="";return;}
 if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(file);
 $("avatar-preview").src=objectUrl;$("avatar-preview").hidden=false;$("orb").querySelector(".face").hidden=true;
});
$("listen").addEventListener("click",async()=>{
 if(!SpeechRecognition){setStatus("Ovoz tanish bu brauzerda mavjud emas. Matn yozing yoki Chrome’da HTTPS orqali oching.");return;}
 try{await requestMicPermission();}catch(e){setStatus("Mikrofon ruxsati berilmadi. Brauzer sozlamalarini tekshiring.");return;}
 if(recognizer){try{recognizer.stop();}catch(_){}}
 recognizer=new SpeechRecognition();recognizer.lang=$("lang").value;recognizer.continuous=false;recognizer.interimResults=true;recognizer.maxAlternatives=1;
 recognizer.onstart=()=>{setStatus("Tinglayapman… Gapiring.");$("listen").classList.add("active");};
 recognizer.onresult=e=>{let interim="";for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal){send(t);return;}interim+=t;}if(interim)setStatus("Eshitildi: "+interim);};
 recognizer.onerror=e=>{setStatus(e.error==="not-allowed"?"Mikrofonga ruxsat yo‘q.":"Ovoz xatosi: "+e.error);};
 recognizer.onend=()=>{$("listen").classList.remove("active");if(status.textContent.startsWith("Tinglayapman"))setStatus("Tayyor");};
 try{recognizer.start();}catch(_){setStatus("Mikrofon band. Bir ozdan qayta urinib ko‘ring.");}
});
$("clear").addEventListener("click",()=>{if(confirm("Suhbat tarixini tozalaysizmi?")){messages.replaceChildren();localStorage.removeItem(CHAT);$("welcome").hidden=false;lastReply="";setStatus("Suhbat tozalandi.");}});
document.querySelectorAll("[data-prompt]").forEach(b=>b.addEventListener("click",()=>send(b.dataset.prompt)));
window.addEventListener("beforeunload",()=>{if("speechSynthesis"in window)window.speechSynthesis.cancel();if(recognizer)try{recognizer.stop();}catch(_){}if(objectUrl)URL.revokeObjectURL(objectUrl);});
loadProfile();showHistory();