"use strict";

// Lightweight language detection and safe conversational templates.
// This does not translate arbitrary text or replace a multilingual language model.
const SCRIPT_RULES = [
  ["zh", /[\\u3400-\\u9fff]/u], ["ja", /[\\u3040-\\u30ff]/u],
  ["ko", /[\\uac00-\\ud7af]/u], ["ar", /[\\u0600-\\u06ff]/u],
  ["hi", /[\\u0900-\\u097f]/u], ["th", /[\\u0e00-\\u0e7f]/u],
  ["he", /[\\u0590-\\u05ff]/u], ["el", /[\\u0370-\\u03ff]/u],
  ["uk", /[ієїґ]/iu], ["ru", /[а-яё]/iu]
];
const LATIN_HINTS = {
  uz: /\\b(salom|assalomu|rahmat|iltimos|qanday|nima|men|siz|haqida|o'zbekiston)\\b/iu,
  en: /\\b(hello|hi|thanks|please|what|where|how|who|the|is|are|you|your)\\b/iu,
  es: /\\b(hola|gracias|por favor|qué|como|dónde|quién|usted|español)\\b/iu,
  fr: /\\b(bonjour|merci|s'il vous plaît|comment|pourquoi|où|vous|est)\\b/iu,
  de: /\\b(hallo|danke|bitte|wie|warum|wo|ist|und|ich)\\b/iu,
  pt: /\\b(olá|obrigado|obrigada|por favor|como|onde|você|não)\\b/iu,
  it: /\\b(ciao|grazie|per favore|come|dove|perché|sono)\\b/iu,
  tr: /\\b(merhaba|teşekkürler|lütfen|nasıl|nerede|neden|ben|sen)\\b/iu,
  id: /\\b(h halo|halo|terima kasih|tolong|bagaimana|dimana|saya|anda)\\b/iu,
  nl: /\\b(hallo|bedankt|alsjeblieft|waar|hoe|waarom|ik|jij)\\b/iu,
  pl: /\\b(cześć|dzień dobry|dziękuję|proszę|jak|gdzie|jest)\\b/iu,
  sv: /\\b(hej|tack|snälla|hur|var|varför|jag|du)\\b/iu,
  vi: /\\b(xin chào|cảm ơn|làm ơn|như thế nào|ở đâu|tôi|bạn)\\b/iu,
  fa: /[پچژگکی]/u
};
const TEXT = {
  uz: {hello:"Salom! Men ULUGBEK AI’man. Sizga qanday yordam bera olaman?",thanks:"Arzimaydi! Yana qanday yordam kerak?",unknown:"Bu savolga hozircha yetarli darajada tekshirilgan ma’lumot topilmadi. Noto‘g‘ri javob to‘qib aytmayman."},
  en: {hello:"Hello! I’m ULUGBEK AI. How can I help you?",thanks:"You’re welcome! What else can I help with?",unknown:"I could not find enough verified information to answer reliably yet. I won’t make up an answer."},
  es: {hello:"¡Hola! Soy ULUGBEK AI. ¿Cómo puedo ayudarte?",thanks:"¡De nada! ¿En qué más puedo ayudarte?",unknown:"Aún no he encontrado información verificada suficiente para responder con fiabilidad. No inventaré una respuesta."},
  fr: {hello:"Bonjour ! Je suis ULUGBEK AI. Comment puis-je vous aider ?",thanks:"Avec plaisir ! Puis-je vous aider pour autre chose ?",unknown:"Je n’ai pas encore trouvé suffisamment d’informations vérifiées pour répondre de manière fiable. Je ne vais pas inventer de réponse."},
  de: {hello:"Hallo! Ich bin ULUGBEK AI. Wie kann ich Ihnen helfen?",thanks:"Gern geschehen! Wobei kann ich noch helfen?",unknown:"Ich habe noch nicht genügend verifizierte Informationen für eine zuverlässige Antwort gefunden. Ich werde nichts erfinden."},
  pt: {hello:"Olá! Sou o ULUGBEK AI. Como posso ajudar?",thanks:"De nada! Em que mais posso ajudar?",unknown:"Ainda não encontrei informações verificadas suficientes para responder com segurança. Não vou inventar uma resposta."},
  it: {hello:"Ciao! Sono ULUGBEK AI. Come posso aiutarti?",thanks:"Prego! In cos’altro posso aiutarti?",unknown:"Non ho ancora trovato informazioni verificate sufficienti per rispondere in modo affidabile. Non inventerò una risposta."},
  tr: {hello:"Merhaba! Ben ULUGBEK AI. Size nasıl yardımcı olabilirim?",thanks:"Rica ederim! Başka nasıl yardımcı olabilirim?",unknown:"Güvenilir bir yanıt için henüz yeterli doğrulanmış bilgi bulamadım. Yanıt uydurmayacağım."},
  ru: {hello:"Здравствуйте! Я ULUGBEK AI. Чем могу помочь?",thanks:"Пожалуйста! Чем ещё могу помочь?",unknown:"Пока не удалось найти достаточно проверенной информации для надёжного ответа. Я не буду придумывать ответ."},
  uk: {hello:"Вітаю! Я ULUGBEK AI. Чим можу допомогти?",thanks:"Будь ласка! Чим іще можу допомогти?",unknown:"Поки що недостатньо перевіреної інформації для надійної відповіді. Я не вигадуватиму відповідь."},
  ar: {hello:"مرحباً! أنا ULUGBEK AI. كيف يمكنني مساعدتك؟",thanks:"على الرحب والسعة! كيف يمكنني المساعدة أيضاً؟",unknown:"لم أجد بعد معلومات موثوقة كافية للإجابة. لن أختلق إجابة."},
  hi: {hello:"नमस्ते! मैं ULUGBEK AI हूँ। मैं आपकी कैसे मदद कर सकता हूँ?",thanks:"आपका स्वागत है! मैं और कैसे मदद कर सकता हूँ?",unknown:"अभी विश्वसनीय उत्तर देने के लिए पर्याप्त सत्यापित जानकारी नहीं मिली। मैं उत्तर गढ़ूँगा नहीं।"},
  zh: {hello:"你好！我是 ULUGBEK AI。有什么可以帮你？",thanks:"不客气！还需要什么帮助？",unknown:"目前还没有找到足够可靠的已核实信息。我不会编造答案。"},
  ja: {hello:"こんにちは！ULUGBEK AIです。どのようなお手伝いができますか？",thanks:"どういたしまして。他にお手伝いできることはありますか？",unknown:"信頼できる回答に十分な確認済み情報がまだありません。回答を捏造しません。"},
  ko: {hello:"안녕하세요! ULUGBEK AI입니다. 무엇을 도와드릴까요?",thanks:"천만에요! 더 도와드릴 일이 있을까요?",unknown:"아직 신뢰할 만한 답변을 위한 검증된 정보가 충분하지 않습니다. 답을 지어내지 않겠습니다."},
  fa: {hello:"سلام! من ULUGBEK AI هستم. چطور می‌توانم کمک کنم؟",thanks:"خواهش می‌کنم! چه کمک دیگری نیاز دارید؟",unknown:"هنوز اطلاعات تأییدشده کافی برای پاسخ مطمئن پیدا نکرده‌ام. پاسخ ساختگی نمی‌دهم."},
  he: {hello:"שלום! אני ULUGBEK AI. איך אפשר לעזור?",thanks:"בשמחה! במה עוד אוכל לעזור?",unknown:"עדיין לא מצאתי מספיק מידע מאומת כדי לענות באופן אמין. לא אמציא תשובה."},
  el: {hello:"Γεια σας! Είμαι το ULUGBEK AI. Πώς μπορώ να βοηθήσω;",thanks:"Παρακαλώ! Πώς αλλιώς μπορώ να βοηθήσω;",unknown:"Δεν βρήκα ακόμη αρκετές επαληθευμένες πληροφορίες για αξιόπιστη απάντηση. Δεν θα επινοήσω απάντηση."},
  th: {hello:"สวัสดี! ฉันคือ ULUGBEK AI มีอะไรให้ช่วยไหม?",thanks:"ยินดีเสมอ! มีอะไรให้ช่วยอีกไหม?",unknown:"ยังไม่มีข้อมูลที่ตรวจสอบแล้วเพียงพอสำหรับคำตอบที่เชื่อถือได้ ฉันจะไม่แต่งคำตอบขึ้นมา"}
};
function detectLanguage(value) {
  const text = String(value || "").trim();
  for (const [language, pattern] of SCRIPT_RULES) if (pattern.test(text)) return language;
  for (const [language, pattern] of Object.entries(LATIN_HINTS)) if (pattern.test(text)) return language;
  return "en";
}
function phrase(value, kind) {
  const language = detectLanguage(value);
  return (TEXT[language] || TEXT.en)[kind] || TEXT.en[kind];
}
module.exports = { detectLanguage, phrase, supportedTemplateLanguages: Object.keys(TEXT) };
