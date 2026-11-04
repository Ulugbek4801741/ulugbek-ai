# ULUGBEK AI — integratsiya auditi (2026-11-04)

## Audit qoidasi

Ushbu hujjat kodda mavjud bo‘lgan yo‘llar, server endpointlari, modul katalogi, testlar va GitHub Actions natijalarini ajratadi. Fayl yoki UI tugmasi mavjudligi xizmat to‘liq ishlashini isbotlamaydi. Har bir modul uchun haqiqiy provider/server, ruxsat, saqlash joyi va ishga tushirish testi alohida talab qilinadi.

## Hozirgi ishlash holati

| Yo‘nalish | Koddagi holat | Haqiqiy cheklov |
|---|---|---|
| Asosiy chat | Ishlaydigan yagona Chat Agent yo‘li; mahalliy qoidaviy javob va ixtiyoriy self-hosted OpenAI-compatible model | O‘qitilgan ULUGBEK neyron modeli mavjud deb da’vo qilinmaydi. Mahalliy model serveri sozlanmasa, javoblar qoidaviy/knowledge fallback bilan cheklanadi. |
| Matematika | Mahalliy xavfsiz hisoblash moduli | Umumiy algebra/ilmiy matematikani to‘liq isbotlovchi CAS emas. |
| Internet tadqiqoti | Ochiq sahifalarni read-only qidirish/o‘qish, URL va hajm cheklovlari | To‘liq internet crawler emas; manbalarni tekshirish zarur. Tashqi saytga yozish/o‘zgartirish yo‘q. |
| Bilim o‘rganish | Lokal bilim nomzodlari va o‘rganish worker’i | Bu model vaznlarini qayta o‘qitish emas. Saqlash JSON fayllariga bog‘liq; bir nechta server nusxasi uchun sinxron DB yo‘q. |
| Agentlar | Mutaxassis rollari registry’da bor | Chat dispatcher ataylab faqat bitta Chat Agentni faollashtiradi. Specialist agentlar avtomatik zanjir bo‘lib ishlamaydi. |
| Vazifa/workflow | Rejalash, xavf tasnifi, test/review bosqichlari | Haqiqiy tashqi amallar adapterlari yo‘q; tasdiqning o‘zi xabar yuborish, deploy yoki fayl o‘zgartirishni bajarmaydi. |
| Rasm | Self-hosted image API adapteri | Alohida GPU/server va URL/credential sozlamalari bo‘lmasa ishlamaydi. |
| Video | Self-hosted video/ComfyUI adapteri | Alohida GPU/server, model workflow va disk kerak; Render Node web-service o‘zi video model emas. |
| Media kutubxonasi | Ochiq media katalogidan qidirish va admin tasdig‘i bilan import | Litsenziya/atributsiya shartlari har bir asset uchun tekshiriladi. |
| Ovozli chat | Brauzer/qurilma ovoz imkoniyatiga bog‘liq | Hamma Android qurilmada bir xil STT/TTS sifati kafolatlanmaydi. |
| Har 5 daqiqalik ovozli hisobot | Ushbu PR tarmog‘ida server generatori va Android foreground service bor | PR hali main’ga birlashtirilmagan; faqat native Android ilovada. Android TTS va fon cheklovlariga bog‘liq. |
| Telefon/kompyuter boshqaruvi | Katalogda rejalashtirilgan | Hozircha real qurilma boshqaruvi yo‘q. |
| To‘lov, wallet, marketplace, ijtimoiy tarmoq, global cloud storage | Alohida feature branch/PR yoki reja sifatida uchraydi | Bularni bitta ishlaydigan mahsulot deb ko‘rsatish mumkin emas; provider, backend, ruxsat va end-to-end test talab qilinadi. |

## Aniqlangan texnik xavflar va tuzatishlar

1. Android TTS boshlanishidan oldin birinchi hisobot kelib qolsa, eski kod hisobot ID’sini ovoz chiqarishdan oldin belgilab qo‘yar edi. TTS hali tayyor bo‘lmaganda hisobot yo‘qolishi mumkin edi. Bu tarmoqda endi faqat TTS tayyor bo‘lsa o‘qiladi; ID faqat ovozli o‘qish tugagandan keyin saqlanadi, xatoda qayta uriniladi.
2. Hisobot matniga worker’larning xom `lastError` satrlari qo‘shilishi mumkin edi. Ular ichki yo‘l yoki maxfiy ma’lumotni oshkor qilmasligi uchun hisobotdan olib tashlandi.
3. Hisobot endi tizimda bitta chat agent faol ekanini, mutaxassis agentlar hali chatda ishga tushmaganini, lokal JSON saqlash va model/ovoz cheklovlarini ochiq aytadi.
4. Android plugin xizmatni ishga tushirish/to‘xtatishdagi Android istisnolarini ushlab, tushunarli xato qaytaradi.

## Render va deploy

- `render.yaml` Render web-service uchun `plan: starter`, `branch: main`, `healthCheckPath: /api/health` va `/var/data` ostida 1 GB diskni so‘raydi.
- Bu fayl Render dashboard’dagi haqiqiy service plan, environment variables yoki oxirgi deploy holatini o‘zi isbotlamaydi. Dashboard bilan solishtirish shart.
- GitHub’dagi mavjud `Deploy ULUGBEK AI Web Demo` workflow GitHub Pages’ga deploy qiladi; u Render deploy emas.
- Ushbu audit jarayonida Render DNS/health endpointiga tashqi tarmoqdan ulanish imkoni bo‘lmadi. Shu sabab Render tiklandi yoki production ishlayapti deb tasdiqlanmaydi.
- Render deploy uchun service dashboard’da GitHub repo/branch, build/start command, environment secrets va disk mount tekshirilishi kerak. API kalitlar GitHub’ga yozilmasin.

## Sinov holati

2026-11-04 dagi PR #55 so‘nggi commit uchun:
- Node.js 20 to‘liq test suite: muvaffaqiyatli.
- Node.js 22 to‘liq test suite: muvaffaqiyatli.
- Docker production container build: muvaffaqiyatli.
- Android debug APK build: muvaffaqiyatli.

Yuqoridagilar CI natijasi. Ular real telefonda ovoz, Render deploy, model endpoint, GPU image/video, multi-user yuklama yoki barcha integratsiyalar end-to-end ishlashini isbotlamaydi. Ushbu audit tarmog‘iga qo‘shilgan yangi tuzatishlar uchun CI qayta ishlashi shart.

## Xavfsiz keyingi bosqichlar

1. PR #54 va PR #55 o‘zgarishlarini alohida ko‘rib, bitta izchil integratsiya PR’ida saqlash.
2. Avval Render dashboard sozlamalarini tekshirish; production’ga avtomatik deploy qilmaslik.
3. Har bir feature PR’ni main bilan yangilab, konfliktlarni alohida tuzatish va o‘z testini ishga tushirish.
4. Chat agentni yagona faol agent sifatida saqlash; specialist agentlarni faqat sandbox, alohida ruxsat, audit log va inson tasdig‘i tayyor bo‘lgandan keyin yoqish.
5. Har bir modul uchun `configured / healthy / tested / unavailable` holatlarini real provider tekshiruvi bilan ko‘rsatish; rejalashtirilgan modulni “ishlayapti” deb ko‘rsatmaslik.
