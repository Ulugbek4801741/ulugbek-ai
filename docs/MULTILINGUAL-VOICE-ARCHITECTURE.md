# ULUGBEK AI: ko‘p tilli ovoz arxitekturasi

Holat: ko‘rib chiqish uchun arxitektura taklifi. Bu hujjat offline nutqni tanish, 200+ til yoki avtomatik model o‘qitish allaqachon ishlayotganini anglatmaydi.

## Maqsad
- Web, Android, iPhone va Windows uchun yagona ovoz interfeysi.
- Internetli va internetsiz rejim; foydalanuvchi tanlagan rejim yashirincha o‘zgarmaydi.
- Tillarni bosqichma-bosqich qo‘shish va har bir tilni alohida sinash.
- Mikrofon ishlayotganini va audio qayerda qayta ishlanishini aniq ko‘rsatish.
- Oddiy nutq avtomatik yuborilmaydi; muhim amallar alohida tasdiqlanadi.

## Tavsiya etilgan arxitektura
UI (web / Capacitor Android+iOS / Electron Windows)
→ VoiceController: start/stop, ruxsat, bekor qilish
→ AudioInput: mikrofon, VAD, format, uzunlik/hajm chegaralari
→ SpeechEngine interfeysi:
  - BrowserSpeechEngine: mos brauzerlarda zaxira variant
  - OnDeviceEngine: sherpa-onnx yoki tekshirilgan mahalliy model
  - ServerSpeechEngine: ixtiyoriy, rozilik talab qiladigan backend
→ LanguageRouter: tanlangan til, aniqlash ishonchliligi, o‘rnatilgan modellar
→ TranscriptReview: foydalanuvchi tahrirlaydigan matn
→ IntentRouter: faqat ruxsat berilgan buyruqlar
→ SpeechOutput: qurilma TTS, mahalliy TTS yoki rozilik bilan onlayn TTS

Har bir engine standart natija qaytarsin: matn, BCP-47 til kodi, ixtiyoriy ishonchlilik darajasi, engine nomi, rejim, model versiyasi va ogohlantirishlar.

## Platformalar
- Web: mavjud brauzer ovoz boshqaruvi zaxira variant bo‘lib qoladi. Brauzer qo‘llashi va offline ishlashi farq qiladi. Tekshirmasdan ‘offline’ deb ko‘rsatilmasin.
- Android/iPhone: yagona interfeys ortida native adapter yoki Capacitor plagin; modelni faqat foydalanuvchi tanlaganda yuklash.
- Windows: Electron ilovasida shu interfeys; transkript hech qachon bevosita shell buyrug‘iga aylanmasin.
- Umumiy: til ro‘yxati, buyruqlar ruxsat ro‘yxati, maxfiylik holatlari va testlar.

## Rejim qoidalari
1. Offline tanlansa, tarmoq engine’iga o‘tmasin. Model yo‘q bo‘lsa, buni tushuntirib, internet borida yuklashni taklif qilsin.
2. Online tanlansa, audio qaysi xizmatga yuborilishi ko‘rsatilsin va yuborishdan oldin rozilik olinsin.
3. Auto rejimda tekshirilgan mahalliy model afzal; tarmoqqa o‘tishdan oldin ogohlantirish/rozilik kerak.
4. Tarmoq xatosida boshqa provayderga yashirincha yuborilmasin.
5. Til noaniq bo‘lsa, qayta aytishni yoki til tanlashni so‘rasin.

## 200+ tilga kengaytirish
Til kodi qo‘llab-quvvatlanishi yetarli emas. Har bir til uchun speech-to-text online/offline, text-to-speech online/offline, tilni aniqlash, sheva qamrovi va test natijalari alohida qayd etilsin.
1-bosqich: o‘zbek (Latin/Cyrillic, model imkoniga qarab), rus, ingliz, hind tillarini real qurilmalarda sinash.
2-bosqich: foydalanuvchi talabi va qonuniy ma’lumotlar mavjudligiga qarab tillarni guruhlab qo‘shish.
3-bosqich: har bir tilning sifat ko‘rsatkichlari e’lon qilingandan keyingina qo‘llab-quvvatlashni da’vo qilish.

## Xavfsiz o‘rganish quvuri
YouTube — material topish manbalaridan biri, lekin barcha videolarni yuklab olish yoki ularda o‘qitish uchun avtomatik ruxsat emas. Faqat tegishli litsenziya/ruxsat va platforma qoidalariga mos material ishlatilsin.
1. Manba URL’i, litsenziya/ruxsat, til va tekshiruvchi holatini qayd qilish.
2. Faqat ruxsat etilgan media/subtitrni qabul qilish; hajm, format va xavfsizlikni tekshirish.
3. Tilni aniqlash, takrorlarni olib tashlash, imkon qadar shaxsiy ma’lumotlarni filtrlash.
4. Trening, validatsiya va test to‘plamlarini manba/gapiruvchilar bo‘yicha ajratish.
5. Modelni ishlab turgan modeldan alohida, takror ishlab chiqariladigan jarayonda o‘qitish.
6. WER/CER, til aniqligi, sheva/shovqin, kechikish, xotira va batareya sarfini o‘lchash.
7. Inson tekshiruvi va imzolangan model manifestidan keyin chiqarish; oldingi versiyaga qaytish imkonini saqlash.
Video yoki audiodagi buyruqlar ishonchsiz ma’lumot hisoblanadi; ular tizim ko‘rsatmasi yoki kod sifatida bajarilmasin.

## Maxfiylik va xavfsizlik
- Mikrofon faqat foydalanuvchi harakati va OS ruxsati bilan yoqilsin; ko‘rinadigan stop tugmasi bo‘lsin.
- Xom audio analytics, log yoki crash report’ga yozilmasin.
- Serverga uzatishda HTTPS, autentifikatsiya, tezlik chegarasi, audio turi va hajm/uzunlik limitlari bo‘lsin.
- Model fayllari ruxsat etilgan HTTPS manbadan kelib, hash/imzo tekshiruvidan o‘tsin.
- Transkript tashqi LLM yoki doimiy saqlashga roziliksiz yuborilmasin.
- Faqat allow-list buyruqlari bajarilsin. To‘lov, akkauntni o‘chirish, tashqi xabar yuborish va kod/shell bajarish transkriptning o‘zi bilan amalga oshmasin.

## Kelajakdagi API shartnomasi (hozircha amalga oshirilmagan)
- GET /api/voice/capabilities — mavjud engine, rejim, til va model versiyalari.
- POST /api/voice/transcribe — faqat aniq rozilikdan keyin, autentifikatsiya, limit va maxfiylik siyosati bilan.
- GET /api/voice/models — ruxsat etilgan model manifesti va hashlar.
- Model yuklash: HTTPS, hash/imzo tekshiruvi, fayl hajmi ko‘rsatilishi, davom ettirish va o‘chirish imkoniyati.

## Testlar va chiqarish shartlari
Unit: til kodi normallashtirish; noaniq natijada qayta so‘rash; Online/Offline rejim buzilmasligi; diktovka matni avtomatik yuborilmasligi; xavfli buyruqlar tasdiqlanishi; stop/cancel xatolarda ham ishlashi; noto‘g‘ri model hash’i rad etilishi.
Integratsiya: mock SpeechEngine, ruxsatsiz yoki katta audio so‘rovlarini rad etish, loglarda audio/transkript yo‘qligi, model yuklash va rollback sinovi.
Qurilmalar: Android past xotirali telefon, iPhone simulator va imkon bo‘lsa haqiqiy iPhone, Windows x64, Chrome/Edge/Safari, offline/slow network, mikrofon ruxsati rad etilgan holat.
Release: mavjud npm test muvaffaqiyatli o‘tsin; yangi engine uchun testlar qo‘shilsin; feature flag va kichik opt-in pilotdan boshlansin. Merge/deploy va tarmoq audio xizmatini yoqish alohida tasdiqlanadi.

## Birinchi amalga oshirish bosqichlari
1. Til imkoniyatlari registri va SpeechEngine interfeysini qo‘shish.
2. Hozirgi brauzer recognizer’ini BrowserSpeechEngine ichiga ko‘chirish; mavjud buyruqlarni buzmaslik.
3. Transkriptni ko‘rib chiqish, allow-list buyruqlari, rejim tanlovi va bekor qilish uchun avtomatik testlar qo‘shish.
4. sherpa-onnx kabi offline yechimlarning model hajmi va tezligini maqsadli qurilmalarda o‘lchash.
5. Server transkripsiyasini faqat ixtiyoriy va rozilik asosidagi adapter sifatida qo‘shish.
6. Model paketlari va ruxsatli ma’lumotlar quvurini asosiy engine testlardan o‘tgandan keyin qurish.

## Tadqiqot havolalari
- sherpa-onnx: https://github.com/k2-fsa/sherpa-onnx
- MDN SpeechRecognition: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- MDN Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API