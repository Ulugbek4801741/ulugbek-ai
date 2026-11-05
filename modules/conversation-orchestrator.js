"use strict";

const languageModule = require("./language-module");
const emotionalIntelligence = require("./emotional-intelligence");
const ethicalReasoning = require("./ethical-reasoning");

function analyze(message) {
  const text = String(message || "").trim();
  const language = languageModule.detectLanguage(text);
  const emotion = emotionalIntelligence.responseGuidance(text);
  const ethics = ethicalReasoning.evaluate(text);
  return {
    language, emotion, ethics,
    cognition: {
      language,
      emotion: emotion.emotion,
      ethics: { risk: ethics.risk, category: ethics.category }
    }
  };
}

function safetyReply(context) {
  const category = context?.ethics?.category;
  const lang = context?.language?.code || "uz";
  if (category === "prevention" && context?.ethics?.detectedCategory === "self_harm") {
    if (lang === "ru") return "Если вы хотите помочь человеку, который может причинить себе вред: спокойно выслушайте его, не оставляйте одного при непосредственной опасности, помогите отойти от опасных предметов и свяжитесь с близким человеком или местной экстренной службой. Спросить прямо о риске самоубийства не усиливает его. Если опасность срочная, обратитесь за экстренной помощью.";
    if (lang === "en") return "If you’re trying to help someone who may hurt themselves: listen calmly, don’t leave them alone if danger is immediate, help them move away from dangerous items, and contact someone they trust or local emergency services. Asking directly about suicide does not increase the risk. If danger is imminent, seek emergency help now.";
    return "Agar o‘ziga zarar yetkazishi mumkin bo‘lgan insonga yordam bermoqchi bo‘lsangiz: uni hukm qilmasdan tinglang, xavf yaqin bo‘lsa yolg‘iz qoldirmang, xavfli buyumlardan uzoqlashishiga yordam bering va ishonchli yaqin inson yoki mahalliy shoshilinch yordam bilan bog‘laning. O‘z joniga qasd haqida to‘g‘ridan-to‘g‘ri so‘rash xavfni oshirmaydi. Xavf darhol bo‘lsa, shoshilinch yordam chaqiring.";
  }
  if (!category || category === "none" || context.ethics.allowed) return null;
  if (category === "self_harm") {
    if (lang === "ru") return "Мне жаль, что вам сейчас так тяжело. Пожалуйста, не оставайтесь в одиночестве. Отойдите от предметов, которыми можно причинить себе вред, и свяжитесь с близким человеком, которому доверяете. Если опасность непосредственная, обратитесь в местную экстренную службу. Вы сейчас в безопасном месте?";
    if (lang === "en") return "I’m sorry you’re facing this. Please don’t stay alone right now. Move away from anything you could use to hurt yourself and contact someone you trust who can stay with you. If you may act on this soon, contact local emergency services now. Are you somewhere safe at this moment?";
    return "Buni boshdan kechirayotganingizdan afsusdaman. Hozir yolg‘iz qolmasligingiz muhim. O‘zingizga zarar yetkazishi mumkin bo‘lgan buyumlardan uzoqlashing va ishonadigan yaqin insoningizga qo‘ng‘iroq qiling yoki yoniga boring. Xavf yaqin bo‘lsa, mahalliy shoshilinch yordam xizmatiga murojaat qiling. Hozir xavfsiz joydamisiz?";
  }
  const replies = {
    violence: {
      uz: "Birovga zarar yetkazish, hujum qilish yoki qurol tayyorlash bo‘yicha amaliy ko‘rsatma bera olmayman. Xavfsizlikni ta’minlash, mojaroni tinch yo‘l bilan hal qilish yoki favqulodda vaziyatdan chiqish bo‘yicha yordam bera olaman.",
      ru: "Я не могу давать практические инструкции по причинению вреда, нападению или изготовлению оружия. Могу помочь с предотвращением опасности, мирным разрешением конфликта и безопасными действиями.",
      en: "I can’t provide instructions for harming someone, attacking, or making weapons. I can help with prevention, de-escalation, and safe emergency steps."
    },
    fraud: {
      uz: "Firibgarlik, aldov yoki parol o‘g‘irlashga yordam bera olmayman. Qonuniy daromad topish, firibgarlikni aniqlash, undan himoyalanish yoki hisobni tiklash bo‘yicha yordam bera olaman.",
      ru: "Я не могу помогать с мошенничеством, обманом или кражей паролей. Могу помочь с законным заработком, выявлением мошенничества, защитой аккаунта и его восстановлением.",
      en: "I can’t help with fraud, deception, or password theft. I can help with lawful ways to earn money, fraud detection, account security, or recovery."
    },
    privacy_abuse: {
      uz: "Birovni roziligisiz yashirin kuzatish yoki josuslik qilishga yordam bera olmayman. Qurilmangizni himoyalash, ruxsatli ota-ona nazorati yoki shaxsiy ma’lumotlarni qonuniy himoya qilishni tushuntira olaman.",
      ru: "Я не могу помогать со слежкой или шпионажем без согласия. Могу объяснить защиту устройства, законный родительский контроль и защиту персональных данных.",
      en: "I can’t help with spying on or tracking someone without consent. I can help secure your devices, set up lawful parental controls, or protect personal data."
    }
  };
  const item = replies[category];
  if (!item) return null;
  return item[lang] || item.uz;
}

function emotionalOpening(context) {
  const label = context?.emotion?.emotion?.label || context?.emotion?.label || "neutral";
  const lang = context?.language?.code || "uz";
  const messages = {
    distress: {
      uz: "Bu vaziyat sizga og‘ir tuyulayotganini tushunaman. Keling, masalani xavfsiz va bosqichma-bosqich ko‘rib chiqamiz.",
      ru: "Понимаю, что вам сейчас может быть тяжело. Давайте спокойно и безопасно разберём ситуацию по шагам.",
      en: "I understand this may feel difficult. Let’s work through it calmly and safely, one step at a time."
    },
    sadness: {
      uz: "Bunday holatni boshdan kechirish qiyin bo‘lishi mumkin. Keling, vaziyatni birga ko‘rib chiqamiz.",
      ru: "Переживать такое может быть непросто. Давайте спокойно разберём ситуацию вместе.",
      en: "That can be difficult to go through. Let’s look at the situation together."
    },
    anger: {
      uz: "Sizni ranjitgan holatni tushunishga harakat qilaman. Keling, vaziyatni keskinlashtirmasdan yechim izlaymiz.",
      ru: "Постараюсь понять, что вас расстроило. Давайте искать решение без обострения ситуации.",
      en: "I’ll try to understand what upset you. Let’s look for a solution without escalating things."
    },
    confusion: {
      uz: "Keling, buni sodda qilib, ketma-ket bosqichlarda tushuntiraman.",
      ru: "Давайте объясню это просто и по шагам.",
      en: "Let me explain this simply, step by step."
    }
  };
  return messages[label]?.[lang] || messages[label]?.uz || "";
}

function status() {
  return {
    ready: true,
    modules: ["language", "emotion", "ethics", "safety-response", "native-fallback", "self-hosted-model"],
    singlePipeline: true,
    safetyCategories: ["self_harm", "violence", "fraud", "privacy_abuse"]
  };
}

module.exports = { analyze, safetyReply, emotionalOpening, status };
