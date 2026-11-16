"use strict";

const HISTORY_CUE = /(?:tarix|tarixiy|hayot(?:i|i\s+va\s+ijodi)|ijod(?:i|iyoti)?|biograf|tarjimai\s+hol|asarlari|meros(?:i)?|\b\d{3,4}\s*yil\b|\b\d+\s*(?:yil|asr|ming\s*yil)\w*\s*(?:oldin|oldingi|avval|avvalgi|ilgari)|\b(?:asr|sulola|hukmdor|podshoh|imperiya|boburnoma|saltanat|jang|taxt|hukmronlik)\w*|histor\w*|centur\w*|dynast\w*)/iu;

const HISTORICAL_ENTITIES = [
  {
    pattern: /\b(?:alisher\s+)?navoiy\b|\balisher\s+navoi\b|\bmir\s+alisher\b/iu,
    canonicalEntity: "Alisher Navoiy (Nizomiddin Mir Alisher)",
    aliases: ["Nizomiddin Mir Alisher", "Alisher Navoiy", "Alisher Navoi", "Navoiy", "Navoi"],
    queryBoost: [
      "Alisher Navoiy 1441 1501 hayoti ijodi tarjimai hol",
      "Alisher Navoiy Xamsa Muhokamat ul-lug'atayn asarlari",
      "Alisher Navoiy official biography Herat 1441 1501"
    ],
    instruction: "Alisher Navoiy haqida: 1441-yil Hirotda tug‘ilgan, 1501-yil Hirotda vafot etgan tarixiy shoir, mutafakkir va davlat arbobi. Asarlari, sanalari va davlat faoliyatini nufuzli manbalardan tekshiring."
  },
  {
    pattern: /\b(?:boburshox|boburshoh|bobur|bobirshox|bobirshoh|babur|zahiriddin\s+muhammad\s+bobur)\b/iu,
    canonicalEntity: "Zahiriddin Muhammad Bobur (Boburshoh)",
    aliases: ["Zahiriddin Muhammad Bobur", "Bobur", "Boburshoh", "Boburshox", "Babur"],
    queryBoost: [
      "Zahiriddin Muhammad Bobur Boburshoh hayoti va tarixiy faoliyati",
      "Babur 1483 1530 Mughal Empire biography",
      "Boburnoma Baburnama primary historical source"
    ],
    instruction: "Boburshox/Boburshoh tarixiy kontekstda Zahiriddin Muhammad Boburga ishora qiladi. Zamonaviy polvon, sportchi, avtomobil yoki bugungi tadbir natijalarini tarixiy savolga aralashtirmang."
  },
  {
    pattern: /\b(?:amir\s+)?temur\b|\btamerlane\b|\bsohibqiron\b/iu,
    canonicalEntity: "Amir Temur (Temur ibn Tarag‘ay)",
    aliases: ["Amir Temur", "Temur ibn Tarag‘ay", "Tamerlane", "Sohibqiron"],
    queryBoost: [
      "Amir Temur 1336 1405 hayoti saltanati tarix",
      "Timur Tamerlane biography 1336 1405 primary sources",
      "Amir Temur davlat boshqaruvi yurishlari tarixiy manbalar"
    ],
    instruction: "Amir Temur haqidagi sanalar, yurishlar va siyosiy voqealarni davrga oid manbalar va zamonaviy ilmiy tadqiqotlar bilan farqlab tekshiring."
  },
  {
    pattern: /\b(?:mirzo\s+)?ulug(?:‘|')?bek\b|\buluğbek\b/iu,
    canonicalEntity: "Mirzo Ulug‘bek (Muhammad Tarag‘ay)",
    aliases: ["Mirzo Ulug‘bek", "Ulug‘bek", "Muhammad Tarag‘ay"],
    queryBoost: [
      "Mirzo Ulugbek 1394 1449 life astronomy Samarkand",
      "Ulug‘bek rasadxonasi Zij-i Sultani ilmiy merosi",
      "Mirzo Ulug‘bek biography historical sources"
    ],
    instruction: "Mirzo Ulug‘bekning hukmdorlik davri va astronomik ilmiy merosini alohida ko‘rib chiqing; sanalar va ilmiy natijalarni ishonchli manbalardan tekshiring."
  },
  {
    pattern: /\b(?:abu\s+rayhon\s+)?beruniy\b|\bal[- ]?biruni\b/iu,
    canonicalEntity: "Abu Rayhon Beruniy",
    aliases: ["Abu Rayhon Beruniy", "Beruniy", "Al-Biruni"],
    queryBoost: [
      "Abu Rayhon Beruniy 973 1048 biography works",
      "Al-Biruni scientific works history astronomy",
      "Abu Rayhon Beruniy hayoti va ilmiy merosi"
    ],
    instruction: "Abu Rayhon Beruniyning hayoti, ilmiy asarlari va ilmiy natijalarini aniq tarixiy kontekstda tekshiring."
  },
  {
    pattern: /\b(?:abu\s+ali\s+ibn\s+sino|ibn\s+sino|avic(enna)?)\b/iu,
    canonicalEntity: "Abu Ali ibn Sino (Avitsenna)",
    aliases: ["Abu Ali ibn Sino", "Ibn Sino", "Avicenna"],
    queryBoost: [
      "Abu Ali ibn Sino 980 1037 biography Canon of Medicine",
      "Ibn Sina Avicenna works philosophy medicine history",
      "Abu Ali ibn Sino hayoti va ilmiy merosi"
    ],
    instruction: "Ibn Sino hayoti va asarlari haqida ma’lumot berganda tarixiy manbalar, tibbiyot tarixi va keyingi rivoyatlarni bir-biridan ajrating."
  }
];

function normalizeHistoryIntent(value) {
  const question = String(value || "").replace(/\s+/g, " ").trim();
  const historyRequested = HISTORY_CUE.test(question);
  const entity = HISTORICAL_ENTITIES.find(item => {
    if (!item.pattern.test(question)) return false;
    if (item.canonicalEntity.startsWith("Zahiriddin")) return historyRequested;
    return historyRequested || /(?:kim\s+bo‘lgan|kim\s+edi|haqida|to‘g‘risida)/iu.test(question);
  });
  if (!entity && !historyRequested) {
    return { isHistorical: false, entity: null, canonicalEntity: null, aliases: [], periodHint: null, queryBoost: [], instruction: "" };
  }
  const oldYears = question.match(/(\d{1,4})\s*(?:yil|asr|ming\s*yil)\w*\s*(?:oldin|oldingi|avval|avvalgi|ilgari)/iu);
  return {
    isHistorical: true,
    entity: entity ? entity.canonicalEntity : null,
    canonicalEntity: entity ? entity.canonicalEntity : null,
    aliases: entity ? entity.aliases : [],
    periodHint: oldYears ? oldYears[0] : null,
    queryBoost: entity ? entity.queryBoost : [
      question + " tarixiy manbalar tarjimai hol",
      question + " ilmiy ensiklopediya universitet tarixiy ma'lumot",
      question + " primary historical sources biography"
    ],
    instruction: entity ? entity.instruction : "Tarixiy savolda shaxs, davr, sana va joyni aniqlang. Zamonaviy ism-sharifdoshlar bilan tarixiy shaxslarni aralashtirmang."
  };
}

function buildHistoricalInstruction(intent) {
  if (!intent?.isHistorical) return "";
  return [
    "TARIXIY TADQIQOT QOIDALARI:",
    intent.instruction || "Tarixiy savolga tarixiy manbalar asosida javob bering.",
    "Savolni aynan tushuning: foydalanuvchi hayoti, ijodi, davri yoki ma'lum yillar oldingi voqeani so‘rayaptimi, aniqlang.",
    "Kamida ikki mustaqil va nufuzli manbani solishtiring; imkon bo‘lsa universitet, davlat, ensiklopediya yoki birlamchi manbadan foydalaning.",
    "Manba sahifasining nashr sanasini tarixiy voqea sanasi bilan adashtirmang.",
    "Qidiruv parchalarini o‘qilgan sahifa bilan tenglashtirmang. Dalil yetarli bo‘lsa to‘liq javob yozing, yetarli bo‘lmasa faqat tasdiqlanmagan qismini belgilang.",
    "Javobni o‘zbek tilida, aniq sarlavha va to‘liq gaplar bilan yozing; qidiruv parchalarini ko‘chirib qo‘ymang."
  ].join("\n");
}

module.exports = { normalizeHistoryIntent, buildHistoricalInstruction, HISTORICAL_ENTITIES };
