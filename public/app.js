const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const form = $("#chat-form");
const input = $("#message");
const send = $("#send");
const messages = $("#messages");
const toast = $("#toast");
const statusLabel = $("#connection-status");
const nativeApp = Boolean(window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform());
let toastTimer;
const views = {
 overview: "Boshqaruv paneli",
 chat: "AI Chat",
 agents: "Agentlar",
 builder: "No-Code Builder",
 workflows: "Ish jarayonlari",
 knowledge: "Bilimlar bazasi",
 market: "Mini-ilovalar",
 security: "Xavfsizlik va ruxsatlar"
};
function notify(message) {
 toast.textContent = message;
 toast.classList.add("show");
 clearTimeout(toastTimer);
 toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function textElement(tag, text, className) {
 const node = document.createElement(tag);
 node.textContent = text;
 if (className) node.className = className;
 return node;
}
function addUserMessage(text) {
 messages.appendChild(textElement("div", text, "user-message"));
 messages.scrollTop = messages.scrollHeight;
}
function addAssistantMessage(title, description) {
 const wrap = document.createElement("div");
 wrap.className = "message assistant-message";
 wrap.appendChild(textElement("div", "U", "mini-avatar"));
 const body = textElement("div", "", "message-body");
 body.appendChild(textElement("b", title));
 body.appendChild(textElement("p", description));
 wrap.appendChild(body);
 messages.appendChild(wrap);
 messages.scrollTop = messages.scrollHeight;
 return body;
}
function makeLocalPlan(prompt) {
 const lower = prompt.toLocaleLowerCase("uz");
 let domain = "Umumiy vazifa";
 let roles = ["Core Coordinator", "Research Agent", "Builder Agent", "Verifier Agent"];
 if (/ilova|sayt|veb|dastur|kod|no.?code|web.?app/.test(lower)) {
   domain = "Ilova yaratish";
   roles = ["Core Coordinator", "Product Agent", "Builder Agent", "Verifier Agent"];
 } else if (/biznes|savdo|do‘kon|dok.on|daromad|mijoz/.test(lower)) {
   domain = "Biznes va mahsulot";
   roles = ["Core Coordinator", "Research Agent", "Business Agent", "Verifier Agent"];
 } else if (/marketing|reklama|kontent|auditoriya/.test(lower)) {
   domain = "Marketing";
   roles = ["Core Coordinator", "Research Agent", "Marketing Agent", "Verifier Agent"];
 } else if (/o‘rgan|ta'lim|kurs|dars|til/.test(lower)) {
   domain = "Ta'lim";
   roles = ["Core Coordinator", "Research Agent", "Education Agent", "Verifier Agent"];
 }
 const steps = [
   {title:"Maqsad va natijani aniqlash", detail:"Kutilayotgan natijani, cheklovlarni va muvaffaqiyat mezonini belgilang.", role:roles[0]},
   {title:"Vazifani kichik qadamlarga ajratish", detail:"Kerakli ma’lumotlar va bajarish ketma-ketligini aniqlang.", role:roles[1]},
   {title:"Bajarish rejasini tayyorlash", detail:"Eng muhim ishni birinchi qo‘yib, kerakli resurslarni belgilang.", role:roles[2]},
   {title:"Natijani tekshirish", detail:"Xatolar, xavfsizlik, sifat va keyingi qadamlarni tekshiring.", role:roles[3]}
 ];
 return {title:domain,steps,note:"Bu hozircha mahalliy rejalashtirish demosi: tashqi internetni mustaqil kezish, real kodni ishga tushirish yoki xizmatlarda harakat qilish bajarilmaydi. Haqiqiy AI uchun serverga model ulanishi kerak."};
}
function renderPlan(plan) {
 const card = textElement("div","","plan-card");
 const head = textElement("div","","plan-head");
 head.appendChild(textElement("div",plan.title));
 head.appendChild(textElement("span","REJA"));
 card.appendChild(head);
 plan.steps.forEach((step,index)=>{
   const row=textElement("div","","plan-step");
   row.appendChild(textElement("span",String(index+1),"step-num"));
   const copy=textElement("div","","step-copy");
   copy.appendChild(textElement("b",step.title));
   copy.appendChild(textElement("p",step.detail + " Mas'ul rol: " + step.role + "."));
   row.appendChild(copy);
   card.appendChild(row);
 });
 card.appendChild(textElement("div",plan.note,"plan-note"));
 messages.appendChild(card);
 messages.scrollTop=messages.scrollHeight;
}
async function planTask(message) {
 try {
   if (!nativeApp) {
     const response=await fetch(new URL("api/agent/plan",document.baseURI),{
       method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({task:message})
     });
     if(response.ok) {
       const data=await response.json();
       if(data.plan && Array.isArray(data.plan.steps)) return data.plan;
     }
   }
 } catch (_) { /* Static GitHub Pages and offline use the local planner. */ }
 return makeLocalPlan(message);
}
form.addEventListener("submit",async(event)=>{
 event.preventDefault();
 const prompt=input.value.trim();
 if(!prompt||send.disabled)return;
 addUserMessage(prompt);
 input.value="";
 send.disabled=true;
 send.textContent="Rejalashtirilmoqda…";
 try {
   addAssistantMessage("Vazifa tahlil qilinmoqda","Maqsad aniqlanmoqda, mos agent rollari tanlanmoqda va bajarish qadamlari tayyorlanmoqda.");
   const plan=await planTask(prompt);
   renderPlan(plan);
 } catch (_) {
   addAssistantMessage("Reja tayyorlashda xatolik","Iltimos, vazifani qisqaroq qilib qayta yozing.");
 } finally {
   send.disabled=false;
   send.innerHTML='Reja tuzish <span>↑</span>';
   input.focus();
 }
});
$$("[data-prompt]").forEach(button=>button.addEventListener("click",()=>{
 input.value=button.dataset.prompt;
 input.focus();
 $("#work-area").scrollIntoView({behavior:"smooth",block:"start"});
}));
function switchView(view){
 const title=views[view]||views.overview;
 $("#page-name").textContent=title;
 $$(".nav-item").forEach(button=>button.classList.toggle("active",button.dataset.view===view));
 $("#sidebar").classList.remove("open");
 if(view==="overview") window.scrollTo({top:0,behavior:"smooth"});
 else if(view==="chat") $("#work-area").scrollIntoView({behavior:"smooth",block:"start"});
 else {
   const messagesByView={
    agents:["Agentlar jamoasi","10 ta asosiy agent roli konsepsiyada belgilangan. Hozirgi MVP faqat vazifani rejalashtiradi; agentlar alohida mustaqil xizmatlar sifatida hali ishga tushirilmagan."],
    builder:["No-Code Builder","No-Code quruvchi modulining dastlabki bosqichi: avval ilova maqsadi, sahifalari, ma’lumotlari va amallarini rejalashtirish. Vizual bloklarni haqiqiy kodga aylantirish keyingi ishlab chiqish vazifasi."],
    workflows:["Ish jarayonlari","Jarayonlarni ketma-ket qadamlar, shartlar, tekshiruv va inson tasdig‘i bilan tashkil qilish rejalashtirilgan. Bu demo hali fon vazifalarini avtomatik ishga tushirmaydi."],
    knowledge:["Bilimlar bazasi","Hozircha saqlanadigan hujjatlar bazasi ulanmagan. Keyingi bosqichda hujjat yuklash, qidirish va manba ko‘rsatish qo‘shiladi."],
    market:["Mini-ilovalar","Mini-ilovalar katalogi uchun modul. Hozir katalog va to‘lov tizimi ulanmagan."],
    security:["Xavfsizlik va ruxsatlar","Xavfli tashqi harakatlar, xaridlar, pul o‘tkazmalari va ommaviy nashrlar uchun inson tasdig‘i talab qilinishi kerak."]
   };
   const info=messagesByView[view];
   if(info){
     $("#work-area").scrollIntoView({behavior:"smooth",block:"start"});
     messages.replaceChildren();
     addAssistantMessage(info[0],info[1]);
   }
 }
}
$$("[data-view]").forEach(button=>button.addEventListener("click",()=>switchView(button.dataset.view)));
$$("[data-go]").forEach(button=>button.addEventListener("click",()=>switchView(button.dataset.go)));
$("#menu-toggle").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#help-button").addEventListener("click",()=>notify("Vazifani yozing va “Reja tuzish” tugmasini bosing. Sinov rejimida reja mahalliy yaratiladi."));
input.addEventListener("keydown",event=>{
 if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();form.requestSubmit();}
});
async function checkServer(){
 try{
  const response=await fetch(new URL("api/health",document.baseURI),{cache:"no-store"});
  if(response.ok){statusLabel.textContent="Server ulangan";return;}
 }catch(_){}
 statusLabel.textContent=nativeApp?"Android demo":"Mahalliy / statik rejim";
}
if("serviceWorker" in navigator && !nativeApp && location.protocol.startsWith("http")){
 window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
}
checkServer();
