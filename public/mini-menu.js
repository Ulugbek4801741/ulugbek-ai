(()=>{"use strict";
const button=document.getElementById("mini-menu-toggle"),menu=document.getElementById("mini-menu"),input=document.getElementById("message"),form=document.getElementById("chat-form");
if(!button||!menu)return;
const close=()=>{menu.hidden=true;button.setAttribute("aria-expanded","false")};
const open=()=>{menu.hidden=false;button.setAttribute("aria-expanded","true"};
button.setAttribute("aria-expanded","false");
button.addEventListener("click",e=>{e.stopPropagation();menu.hidden?open():close()});
menu.addEventListener("click",e=>{
 const item=e.target.closest("button");if(!item)return;
 const label=(item.textContent||"").trim();
 close();
 if(label.includes("O‘quv kurslari")||label.includes("Dasturlash kursi")||label.includes("Ingliz tili kursi")||label.includes("Operator kursi")){window.location.href="./courses.html";return}
 if(label.includes("Video Studio")){window.location.href="./video-studio.html";return}
 if(label.includes("Ijtimoiy tarmoq")){window.location.href="./social.html";return}
 if(label.includes("Virtual kompyuter")){window.location.href="./virtual-computer.html";return}
 if(label.includes("Ilovalarni yuklab olish")){window.location.href="./downloads.html";return}
 if(label.includes("Onlayn do‘kon")||label.includes("Logistika")){const settings=document.getElementById("settings-open");if(settings)settings.click();const business=document.getElementById("business-menu");if(business){const target=label.includes("Logistika")?"logistics":"store";const choice=business.querySelector('[data-open="'+target+'"]');if(choice)choice.click()}return}
 if(label.includes("Integratsiyalar")){const plugins=document.getElementById("side-plugins");if(plugins)plugins.click();return}
 if(label.includes("No-code")||label.includes("Sayt / ilova")){const builder=document.getElementById("side-builder");if(builder)builder.click();return}
 const prompt=item.getAttribute("data-mini-prompt");
 if(prompt&&input&&form){input.value=prompt;input.dispatchEvent(new Event("input",{bubbles:true}));form.requestSubmit()}
});
document.addEventListener("click",e=>{if(!menu.contains(e.target)&&!button.contains(e.target))close()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
})();