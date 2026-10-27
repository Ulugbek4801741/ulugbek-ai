"use strict";
const messages={
 card:"Kartalarni real ulash uchun bank/PSP provayderining tokenlashtirish sahifasi, server webhook imzosi va PCI DSS doirasini sozlash kerak. Bu demo hech qanday karta ma’lumotini so‘ramaydi.",
 crypto:"Kripto hamyon integratsiyasi uchun tanlangan provayder va yurisdiksiya aniqlanadi. Seed phrase yoki maxfiy kalitni saytga kiritmang. Hozircha hamyon ulanmagan.",
 ledger:"To‘lov balansga faqat provayder serverdan imzolangan muvaffaqiyat xabarini tekshirgandan keyin tushishi kerak. Brauzer yuborgan holatga ishonilmaydi."
};
document.querySelectorAll("[data-info]").forEach(button=>button.addEventListener("click",()=>window.alert(messages[button.dataset.info])));
document.getElementById("demo-form").addEventListener("submit",event=>{
 event.preventDefault();
 const service=document.getElementById("service").value.trim();
 const amount=Number(document.getElementById("amount").value);
 if(!service||!Number.isSafeInteger(amount)||amount<1){return;}
 const item={service,amount,reason:document.getElementById("reason").value.trim(),createdAt:new Date().toISOString(),status:"DEMO — tasdiqlanmagan"};
 const result=document.getElementById("demo-result");
 result.replaceChildren();
 const title=document.createElement("strong");title.textContent="Demo so‘rov tayyorlandi — pul olinmadi.";
 const details=document.createElement("p");details.textContent=item.service+" · "+item.amount.toLocaleString("uz-UZ")+" UZS · "+item.status;
 const note=document.createElement("small");note.textContent="Bu ma’lumot faqat ushbu sahifada ko‘rinadi; serverga saqlanmaydi va to‘lov qilmaydi.";
 result.append(title,details,note);
});
