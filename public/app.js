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
let currentMode = "chat";
let adminShortcutCount = 0;
const chatSessionId = (() => {
  try {
    let id = localStorage.getItem("ulugbek-ai-chat-session");
    if (!id) {
      id = (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function")
        ? globalThis.crypto.randomUUID()
        : "session_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 14);
      localStorage.setItem("ulugbek-ai-chat-session", id);
    }
    return id;
  } catch (_) {
    return "session_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 14);
  }
})();
function apiUrl(path) {
 const configured = typeof window.ULUGBEK_API_BASE_URL === "string" ? window.ULUGBEK_API_BASE_URL.trim() : "";
 const base = configured ? configured.replace(/\/+$/, "") + "/" : document.baseURI;
 return new URL(path, base);
}
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
     const response=await fetch(apiUrl("api/agent/plan"),{
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
async function chatTask(message) {
 try {
   if (!nativeApp) {
     const response = await fetch(apiUrl("api/chat"), {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ message, sessionId: chatSessionId })
     });
     if (response.ok) {
       const data = await response.json();
       if (typeof data.reply === "string") return data;
     }
   }
 } catch (_) { /* Explain the actual connection limitation instead of pretending this was an AI answer. */ }
 const configured = typeof window.ULUGBEK_API_BASE_URL === "string" && window.ULUGBEK_API_BASE_URL.trim();
 return {
   reply: configured
     ? "ULUGBEK AI backendiga ulanib bo‘lmadi. Backend serveri, FRONTEND_ORIGIN/CORS sozlamasi va hosting holatini tekshirish kerak."
     : "Haqiqiy AI javobi hozir mavjud emas: backend manzili sozlanmagan. public/config.js fayliga ishga tushirilgan backend HTTPS manzilini kiriting; serverda AI model sozlamalari ham bo‘lishi kerak.",
   mode: "demo",
   connectionError: true
 };
}
async function checkBackendStatus() {
 const configured = typeof window.ULUGBEK_API_BASE_URL === "string" && window.ULUGBEK_API_BASE_URL.trim();
 try {
   const response = await fetch(apiUrl("api/health"), { method: "GET", cache: "no-store" });
   if (!response.ok) throw new Error("Backend HTTP " + response.status);
   const data = await response.json();
   statusLabel.textContent = data.aiConfigured ? "AI server ulangan" : "Server ulangan · AI sozlanmagan";
 } catch (_) {
   statusLabel.textContent = configured ? "Backendga ulanish xatosi" : "Backend manzili sozlanmagan";
 }
}
checkBackendStatus();

function showWelcome() {
 messages.replaceChildren();
 addAssistantMessage("Salom! Men ULUGBEK AI.", "Savolingizni yozing. Suhbat rejimi javob berishga, “Reja tuzish” esa vazifani agent rollari bo‘yicha qadamlarga ajratishga mo‘ljallangan.");
}
form.addEventListener("submit",async(event)=>{
 event.preventDefault();
 const prompt=input.value.trim();
 if(!prompt||send.disabled)return;
 if (prompt === "A4801741_a") {
   adminShortcutCount += 1;
   input.value = "";
   if (adminShortcutCount >= 2) {
     window.location.href = apiUrl("admin.html").toString();
   } else {
     notify("Admin sahifasiga o‘tish uchun kodni yana bir marta kiriting. Kirish uchun serverdagi Google administrator tasdig‘i baribir talab qilinadi.");
   }
   return;
 }
 adminShortcutCount = 0;
 addUserMessage(prompt);
 input.value="";
 send.disabled=true;
 send.textContent=currentMode==="chat"?"Javob tayyorlanmoqda…":"Rejalashtirilmoqda…";
 try {
   if (currentMode === "chat") {
     const body = addAssistantMessage("ULUGBEK AI", "Javob tayyorlanmoqda…");
     const data = await chatTask(prompt);
     const paragraph = body.querySelector("p");
     if (paragraph) paragraph.textContent = data.reply;
     if (data.mode === "multi-agent" && Array.isArray(data.agents) && data.agents.length) {
       body.appendChild(textElement("small", "Chat Agent + mutaxassislar: " + data.agents.map(agent => agent.name).join(", "), "response-note"));
     }
     if (data.mode === "demo") {
       body.appendChild(textElement("small", "Demo rejim · AI backend ulanmagan", "response-note"));
     }
     messages.scrollTop=messages.scrollHeight;
   } else {
     addAssistantMessage("Vazifa tahlil qilinmoqda","Maqsad aniqlanmoqda, mos agent rollari tanlanmoqda va bajarish qadamlari tayyorlanmoqda.");
     const plan=await planTask(prompt);
     renderPlan(plan);
   }
 } catch (_) {
   addAssistantMessage("Xatolik yuz berdi","Iltimos, qayta urinib ko‘ring yoki vazifani qisqaroq yozing.");
 } finally {
   send.disabled=false;
   send.innerHTML=currentMode==="chat"?'Yuborish <span>↑</span>':'Reja tuzish <span>↑</span>';
   input.focus();
 }
});
$("[data-mode]").forEach(button=>button.addEventListener("click",()=>{
 currentMode=button.dataset.mode;
 $("[data-mode]").forEach(item=>item.classList.toggle("active",item===button));
 send.innerHTML=currentMode==="chat"?'Yuborish <span>↑</span>':'Reja tuzish <span>↑</span>';
 input.placeholder=currentMode==="chat"?"ULUGBEK AI’dan nimani so‘ramoqchisiz?":"Qaysi vazifa uchun reja tuzay?";
}));
$("#new-chat").addEventListener("click",()=>{
 showWelcome();
 input.value="";
 notify("Yangi suhbat boshlandi.");
});
$$("[data-prompt]").forEach(button=>button.addEventListener("click",()=>{
 input.value=button.dataset.prompt;
 input.focus();
 $("#work-area").scrollIntoView({behavior:"smooth",block:"start"});
}));

function renderBuilder(){
 messages.replaceChildren();
 addAssistantMessage("No-Code Builder","Loyiha tavsifi va boshlang‘ich veb-fayl yarating. Bu MVP hozircha tayyor native Android/iOS/Windows dastur emas; keyingi yig‘ish va server ishlari talab etiladi.");
 const panel=textElement("section","","builder-panel");
 const makeField=(label,control)=>{const w=textElement("label","","builder-field");w.appendChild(textElement("span",label));w.appendChild(control);return w;};
 const name=document.createElement("input");name.className="builder-input";name.value="Mening ULUGBEK AI ilovam";name.maxLength=60;
 const desc=document.createElement("textarea");desc.className="builder-input";desc.rows=3;desc.maxLength=1200;desc.value="Foydalanuvchilarning muammosini hal qiladigan qulay ilova.";
 const platform=document.createElement("select");platform.className="builder-input";
 [["web","Veb / PWA"],["android","Android (APK uchun yig‘ish kerak)"],["ios","iPhone / iOS (Mac va Xcode kerak)"],["windows","Windows (desktop qadoqlash kerak)"],["all","Barcha platformalar rejasi"]].forEach(([v,t])=>{const o=document.createElement("option");o.value=v;o.textContent=t;platform.appendChild(o);});
 panel.append(makeField("Loyiha nomi",name),makeField("Ilova nima muammoni hal qiladi?",desc),makeField("Maqsadli platforma",platform));
 panel.appendChild(textElement("span","Funksiyalar","builder-label"));
 const features=[["login","Ro‘yxatdan o‘tish va profil"],["chat","AI chat"],["database","Ma’lumotlar bazasi"],["admin","Boshqaruv paneli"],["payments","To‘lovlar"],["offline","Offline asosiy sahifa"]];
 const checks=[];
 const grid=textElement("div","","builder-features");
 features.forEach(([id,label])=>{const l=textElement("label","","builder-check");const c=document.createElement("input");c.type="checkbox";c.value=id;c.checked=["login","chat","database"].includes(id);checks.push(c);l.append(c,document.createTextNode(" "+label));grid.appendChild(l);});
 panel.appendChild(grid);
 const actions=textElement("div","","builder-actions");
 const build=document.createElement("button");build.type="button";build.className="primary-button";build.textContent="Loyiha fayllarini yaratish";
 const json=document.createElement("button");json.type="button";json.className="secondary-button";json.textContent="JSON tavsifini yuklab olish";json.disabled=true;
 actions.append(build,json);panel.appendChild(actions);
 const out=textElement("div","","builder-result");out.setAttribute("aria-live","polite");panel.appendChild(out);messages.appendChild(panel);
 let project=null;
 const download=(file,data,type)=>{const u=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement("a");a.href=u;a.download=file;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);};
 build.addEventListener("click",()=>{
  if(!name.value.trim()){notify("Loyiha nomini kiriting.");name.focus();return;}
  const chosen=checks.filter(c=>c.checked).map(c=>c.value);
  project={product:"ULUGBEK AI App Builder",name:name.value.trim(),description:desc.value.trim(),platform:platform.value,features:chosen,createdAt:new Date().toISOString(),stage:"starter-blueprint",limitations:["Boshlang‘ich shablon; backend va ma’lumotlar bazasi ulanmagan.","Android uchun APK yig‘ish va sinash kerak.","iOS uchun Mac, Xcode va Apple imzolashi kerak.","Windows uchun desktop qadoqlash va sinov kerak."]};
  const esc=x=>x.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const list=chosen.map(id=>features.find(f=>f[0]===id)?.[1]).filter(Boolean).map(x=>"<li>"+esc(x)+"</li>").join("")||"<li>Asosiy sahifa</li>";
  project.starterHtml='<!doctype html><html lang="uz"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(project.name)+'</title><style>*{box-sizing:border-box}body{margin:0;padding:8vh 18px;background:#0b1020;color:#f3f4f6;font:16px system-ui}main{max-width:760px;margin:auto;padding:28px;border:1px solid #334155;border-radius:18px;background:#111827}h1{font-size:clamp(28px,6vw,44px)}p,li{line-height:1.7;color:#cbd5e1}button{padding:12px 16px;border:0;border-radius:10px;background:#a78bfa;font-weight:bold}</style><main><p>ULUGBEK AI · STARTER</p><h1>'+esc(project.name)+'</h1><p>'+esc(project.description)+'</p><h2>Funksiyalar</h2><ul>'+list+'</ul><button onclick="document.getElementById(\'notice\').textContent=\'Boshlang‘ich shablon ishlayapti; backend ulanmagan.\'">Sinab ko‘rish</button><p id="notice"></p></main></html>';
  out.replaceChildren(textElement("b","Boshlang‘ich shablon tayyor"),textElement("p","Tanlangan platforma: "+platform.options[platform.selectedIndex].text),textElement("p","Funksiyalar: "+(chosen.join(", ")||"Asosiy sahifa")));
  const htmlBtn=document.createElement("button");htmlBtn.type="button";htmlBtn.className="primary-button";htmlBtn.textContent="index.html yuklab olish";htmlBtn.addEventListener("click",()=>download("index.html",project.starterHtml,"text/html;charset=utf-8"));out.appendChild(htmlBtn);json.disabled=false;
 });
 json.addEventListener("click",()=>{if(project)download("ulugbek-ai-project.json",JSON.stringify(project,null,2),"application/json;charset=utf-8");});
}
function switchView(view){
 const title=views[view]||views.overview;
 $("#page-name").textContent=title;
 $$(".nav-item").forEach(button=>button.classList.toggle("active",button.dataset.view===view));
 $("#sidebar").classList.remove("open");
 if(view==="overview") window.scrollTo({top:0,behavior:"smooth"});
 else if(view==="chat") $("#work-area").scrollIntoView({behavior:"smooth",block:"start"});
 else if(view==="builder"){ $("#work-area").scrollIntoView({behavior:"smooth",block:"start"}); renderBuilder(); }
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
  const response=await fetch(apiUrl("api/health"),{cache:"no-store"});
  if(response.ok){statusLabel.textContent="Server ulangan";return;}
 }catch(_){}
 statusLabel.textContent=nativeApp?"Android demo":"Mahalliy / statik rejim";
}
if("serviceWorker" in navigator && !nativeApp && location.protocol.startsWith("http")){
 window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
}
checkServer();


/* User preferences and chat composer helpers */
(function setupUserInterface(){
 const byId=id=>document.getElementById(id);
 const backdrop=byId("settings-backdrop");
 const themeChoice=byId("theme-choice");
 const splash=byId("splash-screen");
 const splashInput=byId("splash-input");
 let chosenFiles=[];
 let splashImage="";
 function applyTheme(value){
  const theme=value==="system"?(window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):value;
  document.body.classList.toggle("theme-light",theme==="light");
  try{localStorage.setItem("ulugbek-ai-theme",value);}catch(_){}
 }
 try{const saved=localStorage.getItem("ulugbek-ai-theme")||"dark";themeChoice.value=saved;applyTheme(saved);}catch(_){applyTheme("dark");}
 themeChoice.addEventListener("change",()=>applyTheme(themeChoice.value));
 byId("settings-open").addEventListener("click",()=>{backdrop.hidden=false;});
 byId("settings-close").addEventListener("click",()=>{backdrop.hidden=true;});
 backdrop.addEventListener("click",e=>{if(e.target===backdrop)backdrop.hidden=true;});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!backdrop.hidden)backdrop.hidden=true;});
 // Store custom splash artwork in IndexedDB so it persists without filling localStorage.
 const openImageDB=()=>new Promise((resolve,reject)=>{
  if(!("indexedDB" in window)){reject(new Error("IndexedDB mavjud emas"));return;}
  const req=indexedDB.open("ulugbek-ai-preferences",1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains("settings"))req.result.createObjectStore("settings");};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
 const saveImage=async data=>{const db=await openImageDB();await new Promise((resolve,reject)=>{const tx=db.transaction("settings","readwrite");tx.objectStore("settings").put(data,"splashImage");tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();};
 const loadImage=async()=>{try{const db=await openImageDB();const value=await new Promise((resolve,reject)=>{const req=db.transaction("settings","readonly").objectStore("settings").get("splashImage");req.onsuccess=()=>resolve(req.result||"");req.onerror=()=>reject(req.error);});db.close();return value;}catch(_){return "";}};
 const showSplash=async()=>{
  splashImage=await loadImage();
  if(splashImage){splash.style.backgroundImage="url('"+splashImage+"')";splash.classList.add("has-image");byId("splash-robot").style.visibility="hidden";}
  splash.hidden=false;
  window.setTimeout(()=>{splash.hidden=true;splash.style.backgroundImage="";},3000);
 };
 byId("splash-pick").addEventListener("click",()=>splashInput.click());
 splashInput.addEventListener("change",async()=>{
  const file=splashInput.files&&splashInput.files[0];if(!file)return;
  if(!file.type.startsWith("image/")){notify("Iltimos, rasm faylini tanlang.");return;}
  if(file.size>8*1024*1024){notify("Rasm 8 MB dan kichik bo‘lsin.");return;}
  const reader=new FileReader();
  reader.onload=async()=>{try{await saveImage(reader.result);notify("Ochilish rasmi ushbu qurilmada saqlandi.");}catch(_){notify("Rasmni saqlab bo‘lmadi. Boshqa rasm tanlang.");}};
  reader.readAsDataURL(file);splashInput.value="";
 });
 byId("splash-reset").addEventListener("click",async()=>{try{const db=await openImageDB();await new Promise((resolve,reject)=>{const tx=db.transaction("settings","readwrite");tx.objectStore("settings").delete("splashImage");tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();notify("Standart animatsiyali robot qaytarildi.");}catch(_){notify("Rasm sozlamasini o‘zgartirib bo‘lmadi.");}});
 showSplash();
 const fileInput=byId("file-input"),photoInput=byId("photo-input"),cameraInput=byId("camera-input");
 const refreshFiles=()=>{byId("selected-files").textContent=chosenFiles.length?chosenFiles.map(f=>f.name).join(", "):"Fayl tanlanmagan";};
 const addFiles=files=>{chosenFiles=[...chosenFiles,...Array.from(files||[])].slice(0,10);refreshFiles();if(chosenFiles.length)notify("Fayl tanlandi. Hozircha fayllar chatga yuklanmaydi; server yuklash funksiyasi kerak.");};
 byId("attach-open").addEventListener("click",()=>fileInput.click());
 byId("files-open").addEventListener("click",()=>fileInput.click());
 byId("photos-open").addEventListener("click",()=>photoInput.click());
 byId("camera-open").addEventListener("click",()=>cameraInput.click());
 fileInput.addEventListener("change",()=>addFiles(fileInput.files));
 photoInput.addEventListener("change",()=>addFiles(photoInput.files));
 cameraInput.addEventListener("change",()=>addFiles(cameraInput.files));
 byId("plugins-open").addEventListener("click",()=>notify("Plaginlar katalogi keyingi bosqichda ulanadi."));
 byId("think-toggle").addEventListener("click",()=>{const b=byId("think-toggle");const active=b.getAttribute("aria-pressed")!=="true";b.setAttribute("aria-pressed",String(active));notify(active?"Chuqurroq fikrlash rejimi tanlandi.":"Oddiy rejim tanlandi.");});
 byId("avatar-button").addEventListener("click",()=>notify("Avatar sozlamasi keyingi bosqichda ulanadi."));
 byId("mic-button").addEventListener("click",()=>{
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SpeechRecognition){notify("Bu brauzerda ovozni matnga aylantirish qo‘llab-quvvatlanmaydi.");return;}
  const rec=new SpeechRecognition();rec.lang="uz-UZ";rec.interimResults=false;rec.maxAlternatives=1;
  rec.onresult=e=>{input.value=(input.value+" "+e.results[0][0].transcript).trim();input.focus();};
  rec.onerror=()=>notify("Mikrofon ishlamadi. Brauzer ruxsatlarini tekshiring.");
  try{rec.start();notify("Gapiring — ovozingiz matnga aylantiriladi.");}catch(_){notify("Mikrofonni ishga tushirib bo‘lmadi.");}
 });
})();
