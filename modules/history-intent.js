"use strict";

const BOBUR_NAME = /(?:bobur(?:shox|shoh)?|bobir(?:shox|shoh)?|babur|zahiriddin\s+muhammad\s+bobur)/iu;
const HISTORY_CUE = /(?:tarix|tarixiy|\b\d{3,4}\s*yil\b|\b\d+\s*(?:yil|asr|ming\s*yil)\w*\s*(?:oldin|oldingi|avval|avvalgi|ilgari)|\b(?:asr|sulola|hukmdor|podshoh|imperiya|boburnoma|saltanat|jang|taxt|hukmronlik)\w*|histor\w*|centur\w*|dynast\w*)/iu;

function normalizeHistoryIntent(value) {
  const question = String(value || "").replace(/\s+/g, " ").trim();
  const boburMentioned = BOBUR_NAME.test(question);
  const historyRequested = HISTORY_CUE.test(question);
  if (!boburMentioned || !historyRequested) {
    return { isHistorical: historyRequested, entity: null, canonicalEntity: null, aliases: [], periodHint: null, queryBoost: [] };
  }
  const oldYears = question.match(/(\d{1,4})\s*(?:yil|asr|ming\s*yil)\w*\s*(?:oldin|avval|ilgari)/iu);
  return {
    isHistorical: true,
    entity: "Boburshoh",
    canonicalEntity: "Zahiriddin Muhammad Bobur (Boburshoh)",
    aliases: ["Zahiriddin Muhammad Bobur", "Bobur", "Boburshoh", "Boburshox", "Babur"],
    periodHint: oldYears ? oldYears[0] : null,
    queryBoost: [
      "Zahiriddin Muhammad Bobur Boburshoh hayoti va tarixiy faoliyati",
      "Babur 1483 1530 Mughal Empire biography",
      "Boburnoma Baburnama primary historical source"
    ]
  };
}

function buildHistoricalInstruction(intent) {
  if (!intent?.isHistorical || !intent.canonicalEntity) return "";
  return [
    "TARIXIY SHAXSNI ANIQLASH:",
    "Savoldagi Boburshox/Boburshoh nomi tarixiy kontekstda Zahiriddin Muhammad Boburga ishora qiladi.",
    "Zamonaviy polvon, sportchi, avtomobil yoki bugungi tadbir haqidagi natijalarni tarixiy savolga aralashtirmang.",
    "Davr, tug‘ilgan/vafot etgan sana, joy va voqealarni birlamchi yoki nufuzli tarixiy manbalar bilan tekshiring.",
    "Manba sahifasining nashr sanasini tarixiy voqea sanasi bilan adashtirmang.",
    "Boburnoma kabi birlamchi manbalarni keyingi sharhlardan ajrating; tarjima yoki talqin ekanini belgilang.",
    "Aniq tarixiy da’voni dalil tasdiqlamasa, uni tasdiqlanmagan deb ayting; ism o‘xshashligi bilan shaxsni almashtirmang."
  ].join("\n");
}

module.exports = { normalizeHistoryIntent, buildHistoricalInstruction };
