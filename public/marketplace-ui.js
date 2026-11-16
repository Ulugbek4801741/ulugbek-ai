(function () {
  "use strict";
  const api = (window.ULUGBEK_API_BASE_URL || window.location.origin).replace(/\/$/, "") + "/api/marketplace";
  let user = null, tab = "catalog", filter = "all", query = "", editing = null, overlay, panel;
  const esc = value => String(value == null ? "" : value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  async function request(path, options) {
    const opts = Object.assign({credentials:"include",headers:{"Content-Type":"application/json"}}, options || {});
    const response = await fetch(api + path, opts);
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(data.error || ("Server xatosi: " + response.status));
    return data;
  }
  function ensureModal() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "marketplace-overlay";
    overlay.innerHTML = '<section class="marketplace-panel" role="dialog" aria-modal="true" aria-labelledby="marketplace-title"><header><div><small>ULUGBEK AI · KURSLAR</small><h2 id="marketplace-title">O‘quv kurslari</h2></div><button type="button" class="marketplace-close" aria-label="Yopish">×</button></header><div id="marketplace-body"></div></section>';
    document.body.append(overlay);
    panel = overlay.querySelector("#marketplace-body");
    overlay.querySelector(".marketplace-close").addEventListener("click", close);
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
  }
  function close() { if (overlay) overlay.remove(); overlay = panel = null; }
  function showError(error) {
    const n = panel && panel.querySelector(".marketplace-error");
    if (n) n.textContent = error.message || String(error);
  }
  function authView(mode) {
    ensureModal();
    const title = mode === "register" ? "Yangi hisob yaratish" : mode === "verify" ? "Telefon va emailni tasdiqlash" : "Hisobga kirish";
    let fields = "";
    if (mode === "register") fields = '<label>Telefon raqami<input name="phone" type="tel" placeholder="+998901234567" required></label><label>Elektron pochta<input name="email" type="email" required></label><label>Parol<input name="password" type="password" minlength="10" required></label>';
    else if (mode === "verify") fields = '<label>Telefon raqami<input name="phone" type="tel" placeholder="+998901234567" required></label><label>Elektron pochta<input name="email" type="email" required></label><label>Emailga kelgan 6 xonali kod<input name="emailCode" inputmode="numeric" maxlength="6" required></label><label>SMS orqali kelgan 6 xonali kod<input name="phoneCode" inputmode="numeric" maxlength="6" required></label>';
    else fields = '<label>Email yoki telefon<input name="identifier" autocomplete="username" required></label><label>Parol<input name="password" type="password" autocomplete="current-password" required></label>';
    panel.innerHTML = '<div class="marketplace-auth"><h3>' + title + '</h3><p>' + (mode === "register" ? "Bitta hisob ULUGBEK AI xizmatlari va kurslar bo‘limi uchun ishlatiladi." : mode === "verify" ? "Email va telefoningizga yuborilgan alohida kodlarni kiriting." : "Davom etish uchun hisobingizga kiring.") + '</p><form id="marketplace-auth-form">' + fields + '<button class="marketplace-primary" type="submit">' + (mode === "register" ? "Ro‘yxatdan o‘tish" : mode === "verify" ? "Tasdiqlash" : "Kirish") + '</button></form><p class="marketplace-error" role="alert"></p><div class="marketplace-auth-switch">' + (mode === "login" ? '<button type="button" data-auth="register">Yangi hisob yaratish</button>' : mode === "register" ? '<button type="button" data-auth="login">Hisobim bor — kirish</button>' : '<button type="button" data-auth="login">Kirish sahifasiga qaytish</button>') + '</div></div>';
    panel.querySelector("[data-auth]").addEventListener("click", e => authView(e.currentTarget.dataset.auth));
    panel.querySelector("form").addEventListener("submit", async e => {
      e.preventDefault();
      const values = Object.fromEntries(new FormData(e.currentTarget).entries());
      const button = e.currentTarget.querySelector("button[type=submit]"); button.disabled = true;
      try {
        if (mode === "register") {
          await request("/auth/register", {method:"POST",body:JSON.stringify(values)});
          authView("verify");
          const form = panel.querySelector("form");
          form.elements.phone.value = values.phone; form.elements.email.value = values.email;
        } else if (mode === "verify") {
          await request("/auth/verify", {method:"POST",body:JSON.stringify(values)});
          authView("login");
          panel.querySelector(".marketplace-error").textContent = "Hisob tasdiqlandi. Endi tizimga kiring.";
        } else {
          const result = await request("/auth/login", {method:"POST",body:JSON.stringify(values)});
          user = result.user; await dashboard();
        }
      } catch (error) { showError(error); }
      finally { if (button.isConnected) button.disabled = false; }
    });
  }
  async function checkUser() {
    try { const result = await request("/auth/me"); user = result.user; return true; }
    catch (_) { user = null; return false; }
  }
  async function dashboard() {
    ensureModal();
    panel.innerHTML = '<nav class="marketplace-tabs"><button data-tab="catalog">Katalog</button><button data-tab="teacher">O‘qituvchi</button><button data-tab="student">Xaridlarim</button><button data-action="logout">Chiqish</button></nav><div id="marketplace-view"><p>Yuklanmoqda...</p></div>';
    panel.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => { tab=b.dataset.tab; renderTab(); }));
    panel.querySelector("[data-action=logout]").addEventListener("click", async () => { try { await request("/auth/logout",{method:"POST"}); } catch (_) {} user=null; authView("login"); });
    await renderTab();
  }
  async function renderTab() {
    const view = panel.querySelector("#marketplace-view");
    panel.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("active",b.dataset.tab===tab));
    try {
      if (tab === "catalog") {
        const result = await request("/courses?q="+encodeURIComponent(query)+"&type="+filter);
        view.innerHTML = '<div class="marketplace-toolbar"><input id="marketplace-search" type="search" placeholder="Kurs qidirish..." value="'+esc(query)+'"><select id="marketplace-filter"><option value="all">Barcha kurslar</option><option value="free">Bepul</option><option value="paid">Pullik</option></select></div><div class="marketplace-course-list">' + (result.courses.length ? result.courses.map(c => '<article class="marketplace-course"><h3>'+esc(c.title)+'</h3><p>'+esc(c.description)+'</p><small>'+esc(c.instructor||"O‘qituvchi ko‘rsatilmagan")+' · '+Number(c.price_uzs).toLocaleString("uz-UZ")+' so‘m</small>'+(c.canWatch?'<div class="marketplace-video"><iframe src="https://www.youtube-nocookie.com/embed/'+esc(youtubeId(c.youtube_url))+'" title="'+esc(c.title)+'" loading="lazy" allowfullscreen></iframe></div>':'<p class="marketplace-locked">Pullik kurs. Xarid va to‘lov tasdiqlanishi talab qilinadi.</p>')+'</article>').join("") : '<p class="marketplace-empty">Hozircha kurs topilmadi.</p>')+'</div>';
        view.querySelector("#marketplace-search").addEventListener("input",e=>{query=e.target.value;clearTimeout(window.__marketplaceSearchTimer);window.__marketplaceSearchTimer=setTimeout(renderTab,250);});
        view.querySelector("#marketplace-filter").value=filter;
        view.querySelector("#marketplace-filter").addEventListener("change",e=>{filter=e.target.value;renderTab();});
      } else if (tab === "teacher") {
        const result = await request("/teacher/courses");
        view.innerHTML = '<h3>O‘qituvchi kabineti</h3><form id="marketplace-course-form" class="marketplace-form"><label>Kurs nomi<input name="title" required maxlength="120" value="'+esc(editing?.title||"")+'"></label><label>Muallif<input name="instructor" maxlength="100" value="'+esc(editing?.instructor||"")+'"></label><label>Tavsif<textarea name="description" required maxlength="3000">'+esc(editing?.description||"")+'</textarea></label><label>Narxi (so‘m)<input name="priceUzs" type="number" min="0" step="1000" value="'+esc(editing?.price_uzs||0)+'"></label><label>YouTube URL<input name="youtubeUrl" type="url" required value="'+esc(editing?.youtube_url||"")+'"></label><button class="marketplace-primary" type="submit">'+(editing?"Saqlash":"Kursni joylash")+'</button><button type="button" id="marketplace-cancel-edit">Bekor qilish</button></form><h3>Mening kurslarim ('+result.courses.length+')</h3><div class="marketplace-course-list">'+(result.courses.map(c=>'<article class="marketplace-course"><b>'+esc(c.title)+'</b><p>'+Number(c.price_uzs).toLocaleString("uz-UZ")+' so‘m · Sotuvlar: '+c.sales+'</p><div class="marketplace-actions"><button data-edit="'+esc(c.id)+'">Tahrirlash</button><button data-delete="'+esc(c.id)+'">O‘chirish</button></div></article>').join("")||'<p class="marketplace-empty">Hali kurs joylamagansiz.</p>')+'</div>';
        view.querySelector("#marketplace-course-form").addEventListener("submit",async e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.currentTarget).entries());values.priceUzs=Number(values.priceUzs||0);try{await request(editing?"/courses/"+editing.id:"/courses",{method:editing?"PATCH":"POST",body:JSON.stringify(values)});editing=null;await renderTab();}catch(error){view.insertAdjacentHTML("afterbegin",'<p class="marketplace-error">'+esc(error.message)+'</p>');}});
        view.querySelector("#marketplace-cancel-edit").addEventListener("click",()=>{editing=null;renderTab();});
        view.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>{editing=result.courses.find(c=>c.id===b.dataset.edit);renderTab();}));
        view.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",async()=>{if(!confirm("Ushbu kursni o‘chirasizmi?"))return;try{await request("/courses/"+b.dataset.delete,{method:"DELETE"});await renderTab();}catch(error){alert(error.message);}}));
      } else {
        const result=await request("/student/courses");
        view.innerHTML='<h3>Xarid qilingan kurslar</h3><div class="marketplace-course-list">'+(result.courses.map(c=>'<article class="marketplace-course"><h3>'+esc(c.title)+'</h3><p>'+esc(c.instructor)+'</p><div class="marketplace-video"><iframe src="https://www.youtube-nocookie.com/embed/'+esc(youtubeId(c.youtube_url))+'" title="'+esc(c.title)+'" loading="lazy" allowfullscreen></iframe></div></article>').join("")||'<p class="marketplace-empty">Hozircha xarid qilingan kurs yo‘q.</p>')+'</div>';
      }
    } catch(error) { view.innerHTML='<p class="marketplace-error">'+esc(error.message)+'</p>'; }
  }
  function youtubeId(value) {
    try { const u=new URL(value); if(u.hostname==="youtu.be"||u.hostname==="www.youtu.be")return u.pathname.split("/").filter(Boolean)[0]||""; return u.searchParams.get("v")||u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{6,})/)?.[1]||""; } catch(_){return "";}
  }
  async function openCourses() {
    ensureModal(); tab="catalog"; filter="all"; query=""; editing=null;
    if (await checkUser()) await dashboard(); else authView("login");
  }
  document.addEventListener("click", function(e) {
    const open = e.target.closest('[data-open="courses"],[data-tab="courses"]');
    if (!open) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    openCourses();
  }, true);
  window.addEventListener("keydown",e=>{if(e.key==="Escape"&&overlay)close();});
})();
