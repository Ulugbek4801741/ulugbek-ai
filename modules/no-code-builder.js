"use strict";

const MAX_TASK = 4000;
function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function cleanText(value, max = 120) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function appNameFromTask(task) {
  const match = String(task).match(/(?:nomli|nomi|named)\s*["'“”]?([^"'“”.,;!?]{2,60})/iu);
  return cleanText(match?.[1] || "Yangi loyiha", 48) || "Yangi loyiha";
}
function chooseTemplate(task) {
  const value = task.toLocaleLowerCase("uz");
  if (/(do.kon|magazin|shop|store|mahsulot|savdo|buyurtma)/iu.test(value)) return "storefront";
  if (/(portfolio|rezyume|resume|shaxsiy sayt|xizmatlarim)/iu.test(value)) return "portfolio";
  if (/(kurs|ta.lim|dars|o.quv)/iu.test(value)) return "course";
  return "universal";
}
function buildProject(input = {}) {
  const rawTask = typeof input.task === "string" ? input.task : "";
  const task = cleanText(rawTask, MAX_TASK);
  if (!task) throw Object.assign(new Error("Ilova g‘oyasini yozing."), { statusCode: 400 });
  if (rawTask.length > MAX_TASK) throw Object.assign(new Error("Topshiriq 4000 belgidan oshmasligi kerak."), { statusCode: 413 });
  const name = appNameFromTask(task);
  const template = chooseTemplate(task);
  const safeName = escapeHtml(name);
  const safeTask = escapeHtml(task);
  const cards = template === "storefront"
    ? [["Mahsulotlar","Mahsulotlaringizni tartibli ko‘rsating."],["Buyurtmalar","Mijozlar uchun buyurtma jarayonini tushuntiring."],["Aloqa","Savollar uchun bog‘lanish ma’lumotini kiriting."]]
    : template === "portfolio"
      ? [["Men haqimda","Tajriba va yo‘nalishingizni tanishtiring."],["Ishlarim","Loyihalar va natijalarni namoyish qiling."],["Aloqa","Hamkorlik uchun bog‘lanish yo‘lini qo‘shing."]]
      : template === "course"
        ? [["Kurslar","O‘quv dasturlari va mavzularni joylashtiring."],["Darslar","Darslar ketma-ketligini tushuntiring."],["Ro‘yxatdan o‘tish","O‘quvchilar uchun aloqa ma’lumotini kiriting."]]
        : [["Asosiy imkoniyatlar","Loyihangizning eng muhim funksiyalarini ko‘rsating."],["Qanday ishlaydi","Foydalanuvchi uchun jarayonni sodda tushuntiring."],["Aloqa","Bog‘lanish ma’lumotlarini o‘zingiz kiriting."]];
  const cardHtml = cards.map(([heading, description]) => '<article class="card"><h2>' + escapeHtml(heading) + '</h2><p>' + escapeHtml(description) + '</p></article>').join("\n");
  const html = '<!doctype html>\n<html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#111827"><meta name="description" content="' + escapeHtml(cleanText(task,150)) + '"><link rel="manifest" href="./manifest.webmanifest"><title>' + safeName + '</title><style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:#f3f5f8;color:#172033}header{padding:22px max(20px,calc((100% - 1000px)/2));background:#111827;color:white}main{max-width:1000px;margin:auto;padding:48px 20px}.hero{padding:42px 28px;border-radius:22px;background:white;box-shadow:0 12px 35px #11182712}h1{font-size:clamp(2rem,6vw,3.5rem);margin:0 0 14px}.muted{color:#5b6475;line-height:1.7}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:24px}.card{padding:22px;border-radius:16px;background:white;border:1px solid #e3e7ee}.card h2{margin-top:0}footer{max-width:1000px;margin:auto;padding:20px;color:#697386;font-size:.9rem}button{border:0;border-radius:12px;background:#315bd6;color:white;padding:13px 18px;font-weight:650}</style></head><body><header><strong>' + safeName + '</strong></header><main><section class="hero"><h1>' + safeName + '</h1><p class="muted">ULUGBEK AI tomonidan topshiriqingiz asosida yaratilgan boshlang‘ich web-ilova.</p><p class="muted"><strong>Talab:</strong> ' + safeTask + '</p><button type="button" onclick="document.getElementById(\'features\').scrollIntoView({behavior:\'smooth\'})">Imkoniyatlarni ko‘rish</button></section><section class="grid" id="features">' + cardHtml + '</section></main><footer>ULUGBEK AI · Boshlang‘ich shablon. To‘lov, akkaunt, ma’lumotlar bazasi va server funksiyalari ulanmagan.</footer></body></html>';
  const manifest = JSON.stringify({name,short_name:name.slice(0,24),start_url:"./",display:"standalone",background_color:"#f3f5f8",theme_color:"#111827",lang:"uz"},null,2);
  const readme = ["# " + name,"","ULUGBEK AI yaratgan boshlang‘ich web-ilova.","","Ishga tushirish: index.html faylini brauzerda oching yoki statik hostingga joylang.","","Cheklov: backend, akkaunt, to‘lov, ma’lumotlar bazasi va Android APK build hali ulanmagan.","","Dastlabki talab:",task].join("\n");
  return {
    ok:true, product:{name,template,version:"0.1.0",kind:"static-pwa-starter"},
    files:[{path:"index.html",content:html},{path:"manifest.webmanifest",content:manifest},{path:"README.md",content:readme}],
    verification:{generated:true,htmlEscaped:true,externalScripts:false,backendConnected:false,apkBuilt:false,deployed:false},
    nextSteps:["Backend va ma’lumotlar bazasini qo‘shish.","GitHub alohida omboriga joylash va kod tekshiruvi.","Android Capacitor wrapper va APK build muhitini ulash.","HTTPS hostingga deploy qilib jonli URLni tekshirish."]
  };
}
module.exports={buildProject,chooseTemplate,appNameFromTask,escapeHtml};
