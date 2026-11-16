"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  const storeKey = "ulugbek-business-hub-v1";
  const load = () => { try { return JSON.parse(localStorage.getItem(storeKey) || '{"products":[],"shipments":[],"ads":[]}'); } catch (_) { return {products:[],shipments:[],ads:[]}; } };
  let data = load();
  let active = "store";
  const save = () => { try { localStorage.setItem(storeKey, JSON.stringify(data)); toast("Ma’lumot qurilmada saqlandi."); } catch (_) { toast("Saqlash uchun qurilmada joy yetarli emas."); } };
  const toast = (message) => { let n=$("business-toast"); if(!n){n=document.createElement("div");n.id="business-toast";n.className="business-toast";document.body.append(n);} n.textContent=message;n.classList.add("show");clearTimeout(n._timer);n._timer=setTimeout(()=>n.classList.remove("show"),2400); };
  const escape = (v) => String(v ?? "").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const menu = document.createElement("div");
  menu.id="business-menu";menu.className="business-menu";menu.hidden=true;
  menu.innerHTML='<button type="button" data-open="store"><span>🛍️</span><span><b>Onlayn magazin</b><small>Mahsulotlar va buyurtmalar</small></span></button><button type="button" data-open="logistics"><span>🚚</span><span><b>Logistika</b><small>Jo‘natma va yetkazib berish</small></span></button><button type="button" data-open="ads"><span>📣</span><span><b>Reklama joylashtirish</b><small>E’lon va reklama kampaniyalari</small></span></button><div class="business-menu-divider"></div><button type="button" data-open="settings"><span>⚙️</span><span><b>Chat sozlamalari</b><small>Avvalgi sozlamalar</small></span></button>';
  document.body.append(menu);
  const modal=document.createElement("div");modal.id="business-modal";modal.className="business-backdrop";modal.hidden=true;
  modal.innerHTML='<section class="business-panel" role="dialog" aria-modal="true" aria-labelledby="business-title"><header class="business-header"><div><p class="business-eyebrow">ULUGBEK AI · BIZNES</p><h2 id="business-title">Biznes boshqaruvi</h2><p class="business-subtitle">Mahsulot, yetkazib berish va reklama</p></div><button type="button" class="business-close" aria-label="Yopish">×</button></header><nav class="business-tabs" aria-label="Biznes bo‘limlari"><button type="button" data-tab="store">🛍️ Magazin</button><button type="button" data-tab="logistics">🚚 Logistika</button><button type="button" data-tab="ads">📣 Reklama</button></nav><div id="business-content"></div><footer class="business-footer"><span>Ma’lumotlar hozircha faqat shu brauzer/qurilmada saqlanadi.</span><button type="button" id="business-export">JSON nusxa olish</button></footer></section>';
  document.body.append(modal);
  const content=$("business-content");
  function render(){
    modal.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===active));
    const config={
      store:{title:"Onlayn magazin",desc:"Mahsulot katalogini yarating va boshqaring.",fields:[["name","Mahsulot nomi","text"],["price","Narxi (so‘m)","number"],["stock","Soni","number"],["description","Qisqa tavsif","text"]],button:"Mahsulot qo‘shish",list:"Mahsulotlar"},
      logistics:{title:"Logistika",desc:"Jo‘natmalar va yetkazib berish holatini qayd eting.",fields:[["order","Buyurtma raqami","text"],["recipient","Qabul qiluvchi","text"],["phone","Telefon","tel"],["destination","Manzil","text"]],button:"Jo‘natma qo‘shish",list:"Jo‘natmalar"},
      ads:{title:"Reklama joylashtirish",desc:"Reklama matnini tayyorlang va holatini boshqaring.",fields:[["title","Reklama sarlavhasi","text"],["body","Reklama matni","text"],["url","Havola (ixtiyoriy)","url"]],button:"Reklama yaratish",list:"Reklamalar"}
    }[active];
    const items=data[active==="store"?"products":active==="logistics"?"shipments":"ads"];
    content.innerHTML='<div class="business-intro"><h3>'+config.title+'</h3><p>'+config.desc+'</p></div><form id="business-form" class="business-form">'+config.fields.map(([name,label,type])=>'<label>'+label+'<input name="'+name+'" type="'+type+'" '+(type==="number"?'min="0" step="1"':'')+' '+(name==="name"||name==="title"||name==="order"?'required':'')+'></label>').join("")+'<button class="business-primary" type="submit">'+config.button+'</button></form><div class="business-list-head"><h3>'+config.list+' <span>('+items.length+')</span></h3><button type="button" id="business-clear">Bo‘limni tozalash</button></div><div class="business-items">'+(items.length?items.map((item,i)=>'<article class="business-item"><div><b>'+escape(item.name||item.order||item.title)+'</b><p>'+escape(item.description||item.destination||item.body||"")+'</p><small>'+escape(item.meta||"")+'</small></div><div class="business-item-actions">'+(active==="logistics"?'<select data-status="'+i+'" aria-label="Jo‘natma holati"><option '+(item.status==="Yangi"?"selected":"")+' >Yangi</option><option '+(item.status==="Yo‘lda"?"selected":"")+' >Yo‘lda</option><option '+(item.status==="Yetkazildi"?"selected":"")+' >Yetkazildi</option></select>':active==="ads"?'<span class="business-status">'+escape(item.status||"Qoralama")+'</span>':'')+'<button type="button" data-delete="'+i+'" aria-label="O‘chirish">O‘chirish</button></div></article>').join(""):'<div class="business-empty">Hozircha ma’lumot yo‘q. Yuqoridagi shakl orqali birinchi yozuvni qo‘shing.</div>')+'</div>';
    $("business-form").addEventListener("submit",e=>{e.preventDefault();const f=new FormData(e.currentTarget);const v=Object.fromEntries(f.entries());if(active==="store"){v.price=Number(v.price||0);v.stock=Number(v.stock||0);v.meta=(v.price.toLocaleString("uz-UZ")+" so‘m · "+v.stock+" dona");data.products.unshift(v);}else if(active==="logistics"){v.status="Yangi";v.meta=v.phone||"Telefon kiritilmagan";data.shipments.unshift(v);}else{v.status="Qoralama";data.ads.unshift(v);}save();render();});
    $("business-clear").onclick=()=>{if(confirm(config.list+" ro‘yxatini butunlay tozalaysizmi?")){if(active==="store")data.products=[];else if(active==="logistics")data.shipments=[];else data.ads=[];save();render();}};
    content.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>{const i=Number(b.dataset.delete);if(active==="store")data.products.splice(i,1);else if(active==="logistics")data.shipments.splice(i,1);else data.ads.splice(i,1);save();render();});
    content.querySelectorAll("[data-status]").forEach(s=>s.onchange=()=>{data.shipments[Number(s.dataset.status)].status=s.value;save();render();});
  }
  function open(tab){active=tab;menu.hidden=true;modal.hidden=false;render();}
  const settingsButton=$("settings-open");
  if(settingsButton){settingsButton.setAttribute("aria-label","Biznes va qo‘shimcha menyu");settingsButton.title="Biznes va qo‘shimcha menyu";settingsButton.onclick=()=>{menu.hidden=!menu.hidden;};}
  menu.addEventListener("click",e=>{const b=e.target.closest("[data-open]");if(!b)return;if(b.dataset.open==="settings"){menu.hidden=true;const old=$("settings-modal");if(old)old.hidden=false;}else open(b.dataset.open);});
  modal.querySelector(".business-close").onclick=()=>modal.hidden=true;
  modal.addEventListener("click",e=>{if(e.target===modal)modal.hidden=true;});
  modal.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{active=b.dataset.tab;render();});
  $("business-export").onclick=()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="ulugbek-business-data.json";a.click();URL.revokeObjectURL(url);toast("JSON nusxa yuklab olindi.");};
  document.addEventListener("click",e=>{if(!menu.hidden&&!menu.contains(e.target)&&e.target!==settingsButton)menu.hidden=true;});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){menu.hidden=true;modal.hidden=true;}});
})();