"use strict";
const $ = (id) => document.getElementById(id);
const messages = $("messages"), status = $("status"), orb = $("orb");
const STORE = "ulugbek_voice_profile_v1", CHAT = "ulugbek_voice_chat_v1";
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognizer = null, lastReply = "", objectUrl = "", micStream = null, sending = false;
const SESSION_KEY = "ulugbek_voice_session_v1";
function voiceSessionId(){
  try {
    let id=localStorage.getItem(SESSION_KEY)||"";
    if(!/^[a-zA-Z0-9_-]{8,80}$/.test(id)){id=(crypto.randomUUID?crypto.randomUUID().replace(/-/g,""):"v"+Date.now().toString(36)+Math.random().toString(36).slice(2));localStorage.setItem(SESSION_KEY,id);}
    return "voice-"+id;
  } catch (_) { return "voice-"+Date.now().toString(36)+Math.random().toString(36).slice(2); }
}
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
async function send(text){
 const clean=String(text||"").trim();
 if(!clean||sending)return;
 sending=true;
 $("welcome").hidden=true;
 addMessage(clean,"user");
 $("message").value="";
 setStatus("ULUGBEK AI serveriga yuborilmoqda…");
 try{
  const response=await fetch(apiUrl("/api/chat"),{
   method:"POST",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({message:clean,sessionId:voiceSessionId()}),
   cache:"no-store"
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||("Server HTTP "+response.status));
  if(typeof data.reply!=="string"||!data.reply.trim())throw new Error("Server javob matnini qaytarmadi.");
  lastReply=data.reply.trim();
  addMessage(lastReply,"assistant");
  setStatus(data.mode==="native-only-error"?"Server AI xatosi":"Server javobi tayyor");
  if(document.visibilityState!=="hidden")speak(lastReply);
 }catch(error){
  const message=error&&error.message?error.message:"Noma’lum ulanish xatosi";
  addMessage("Server bilan aloqa amalga oshmadi: "+message,"assistant");
  setStatus("Serverga ulanish xatosi — qayta urinib ko‘ring");
 }finally{
  sending=false;
 }
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