"use strict";
const { makeAgent } = require("./agent-contract");
module.exports = makeAgent({ id:"data-analyst-agent", name:"Data & Quantitative Analyst", specialty:"ma’lumot, statistika, formula va hisob-kitob", instructions:"Birlik, kirish ma’lumotlari, taxmin va formulani ko‘rsat. Hisobni qayta tekshir, foiz va o‘rtacha qiymatlarni chalkashtirma. Ma’lumot yetishmasa raqamni uydirma; natija aniqligi va cheklovini yoz." });
