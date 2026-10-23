# ULUGBEK AI — Global platform arxitekturasi va rivojlanish rejasi

## 1. Maqsad

ULUGBEK AI — ko‘p tilli, global foydalanuvchilar uchun AI yordamchisi, agentlar, no-code/low-code dastur yaratish, ijtimoiy tarmoq, fayl/xotira, ishlab chiquvchi vositalari va keyinchalik hamkor xizmatlarni birlashtiruvchi platforma.

Bu hujjat maqsad va bosqichlarni belgilaydi. Unda tilga olingan imkoniyatlarning barchasi hozir kodda mavjud yoki ishlab turganini anglatmaydi.

## 2. Mahsulot modullari

1. **AI Chat** — bir nechta model provayderiga ulanish uchun adapterlar, suhbat tarixi, foydalanuvchi roziligi bilan xotira, fayl yuklash.
2. **AI Agentlar** — vazifani rejalashtirish, vositalar katalogi, ish holati, natijani tekshirish, limitlar va audit jurnali. Yuqori xavfli harakatlar uchun inson tasdig‘i.
3. **No-code Builder** — vizual sahifa/ilova muharriri, shablonlar, versiyalar, preview, eksport va keyinchalik Android build. Ishonchsiz kodni asosiy serverda bevosita ishga tushirmaslik.
4. **Shaxsiy va ijtimoiy tarmoq** — profil, post, rasm/video, obuna, layk, izoh, xabar, bloklash/shikoyat, moderatsiya va maxfiylik sozlamalari.
5. **Xotira va fayllar** — foydalanuvchi kvotasi, fayllarni saqlash, versiya, zaxira nusxa, o‘chirish/eksport, shifrlash va xarajat monitoringi.
6. **Ovoz va tillar** — nutqni matnga aylantirish, matnni ovozga aylantirish, til sozlamalari; imkoniyatlar brauzer/qurilma va provayderga bog‘liq.
7. **Internet tadqiqoti** — ruxsat etilgan manbalarni qidirish, manba havolalari, yangilikning sanasi, robots.txt va sayt shartlariga rioya qilish, zararli sahifalardan himoya.
8. **Savdo va xizmatlar bozori** — xizmatlar katalogi, sotuvchi profili, buyurtma, to‘lov provayderi, nizolarni ko‘rib chiqish va firibgarlik monitoringi.
9. **Logistika va transport** — hamkor API orqali yetkazib berish, kuzatuv, taksi/transport buyurtmalari; hududiy hamkorlar va ruxsatlar talab etiladi.
10. **Reklama** — foydalanuvchiga belgilangan homiylik kontenti, rozilik va maxfiylik nazorati, reklama beruvchi tekshiruvi.
11. **Moliyaviy integratsiyalar** — faqat qonuniy, ruxsatli bank/fintech provayderlari orqali. Kripto, aksiya va valyuta savdosi faqat tegishli yurisdiksiyadagi litsenziyalar, KYC/AML, risk ogohlantirishlari va provayder shartlari tekshirilgandan keyin.
12. **Administrator boshqaruvi** — rollar va huquqlar, foydalanuvchi murojaatlari, xizmat holati, audit, xarajatlar, kvotalar, xavfsizlik ogohlantirishlari, yangilanish takliflari va qaytarish (rollback).

## 3. Xotira bo‘yicha muhim iqtisodiy shart

10 GB bepul va 100 TB pullik xotira — bu mahsulot siyosati bo‘yicha maqsad, hozirgi infratuzilma kafolati emas. 100 TB — har bir foydalanuvchi uchun juda katta xarajat va sig‘im talabidir. Ishga tushirishdan oldin quyidagilar aniqlanishi kerak:

- kvota har bir foydalanuvchigami yoki tarif bo‘yichami;
- fayl hajmi/turi va umumiy trafik limitlari;
- saqlash provayderi, replikatsiya va zaxira nusxa narxi;
- fayllarni saqlash muddati, o‘chirish va ma’lumotlarni eksport qilish;
- bepul tarif uchun adolatli foydalanish va suiiste’molga qarshi limitlar.

Avval kichik, o‘lchanadigan kvota va xarajat monitoringi bilan boshlash, talab hamda moliyalashtirishga qarab oshirish tavsiya etiladi.

## 4. Tavsiya etilgan texnik tuzilma

- **Web frontend:** mobilga mos, kirish imkoniyati va ko‘p tilli interfeys.
- **Backend API:** autentifikatsiya, ruxsatlar, validatsiya, rate limit, audit va versiyalangan API.
- **Ma’lumotlar bazasi:** PostgreSQL kabi boshqariladigan DB; migratsiyalar va zaxira nusxalar.
- **Fayl saqlash:** obyekt saqlash (S3-mos xizmat) va imzolangan, muddati cheklangan yuklab olish havolalari.
- **AI qatlam:** provayder adapterlari, xarajat/tezlik limitlari, maxfiy ma’lumotlarni himoya qilish va muqobil provayder.
- **Fon vazifalari:** navbat/worker; uzoq davom etadigan agent va media ishlarini HTTP so‘roviga bog‘lab qo‘ymaslik.
- **Monitoring:** loglar, xatolar, ishlash vaqti, xarajat, ogohlantirish va audit.
- **Xavfsizlik:** OAuth, rollarga asoslangan kirish, CSRF/CORS sozlamalari, maxfiy kalitlarni faqat server secret sifatida saqlash, shifrlash, dependency scanning va zaxiradan tiklash sinovi.
- **Deploy:** test va production muhitlarini ajratish, CI testlari, bosqichma-bosqich nashr va rollback.

GitHub Pages faqat statik frontendni joylaydi; u Express API, foydalanuvchi bazasi yoki maxfiy kalitlarni xavfsiz saqlovchi server o‘rnini bosa olmaydi.

## 5. Bosqichma-bosqich amalga oshirish

### 0-bosqich — mavjud kod auditi
- GitHub Actions va testlarni tekshirish.
- Mavjud sahifalar/API endpointlarini inventarizatsiya qilish.
- Ishlaydigan, qisman ishlaydigan va faqat rejalashtirilgan imkoniyatlarni alohida belgilash.
- Sirlar repozitoriyga tushmaganini tekshirish.

### 1-bosqich — ishonchli MVP
- Server deploy, health checks va loglar.
- Ro‘yxatdan o‘tish/kirish va rollar.
- AI chat uchun server-side provayder konfiguratsiyasi.
- PostgreSQL, suhbat tarixi va fayl saqlashning boshlang‘ich versiyasi.
- Administrator paneli va audit jurnali.
- Avtomatik testlar, xatolarni kuzatish va zaxira nusxa.

### 2-bosqich — ijtimoiy tarmoq va fayllar
- Profil, post, media, layk, kuzatish, izoh, xabarlar.
- Maxfiylik sozlamalari, shikoyat, bloklash va moderatsiya.
- Kvotalar, yuklash limitlari va media xavfsizligi.

### 3-bosqich — AI agentlar va no-code
- Agent rejalashtirish, vazifa navbati va natijani tekshirish.
- No-code builder, preview, versiyalash va eksport.
- Xavfsiz sandbox va administrator tasdig‘i bilan deploy.

### 4-bosqich — global xizmatlar
- Ko‘p til, mintaqaviy sozlamalar va xalqaro kuzatuv.
- Hamkor APIlar orqali logistika, taksi, savdo va reklama.
- To‘lov provayderlari va qonuniy moliyaviy integratsiyalar.
- Yuklama testlari, maxfiylik/qonun talablarini ko‘rib chiqish va favqulodda tiklash.

## 6. Internetdan o‘rganish va xavfsiz o‘zini takomillashtirish

1. Manbalarni qidirish va manba/sana bilan qayd etish.
2. Texnologiyani litsenziya, xavfsizlik, moslik va xarajat bo‘yicha baholash.
3. Taklif va o‘zgarishlar uchun alohida branch/patch yaratish.
4. Avtomatik testlar, dependency/security scan va sandbox sinovi.
5. O‘zgarishlar farqi va xavflarini administratorga ko‘rsatish.
6. Tasdiqdan keyingina staging, so‘ng production.
7. Muammo yuz bersa rollback; har bir harakat audit jurnaliga yoziladi.

Internetdagi sahifa yoki fayldagi ko‘rsatmalar tizim siyosatini bekor qila olmaydi. Maxfiy kalitlar, foydalanuvchi ma’lumotlari yoki pul harakatlari agentga avtomatik berilmaydi.

## 7. Ishga tushirish mezonlari

Har bir modul uchun:
- avtomatik testlar va muvaffaqiyat mezonlari;
- ruxsatsiz kirish va zararli yuklamalar sinovi;
- mobil internetda ishlash va xatolik holatlari;
- log, ogohlantirish va rollback;
- ma’lumotlar zaxirasi va tiklash sinovi;
- xarajat/kvota limitlari;
- foydalanuvchi roziligi va maxfiylik matnlari.

“Xatosiz” ishlashni oldindan kafolatlab bo‘lmaydi. Maqsad — xatolarni erta aniqlash, zararini cheklash va tiklashni tekshirib borish.

## 8. Hozirgi cheklovlar

- GitHub Pages faqat frontendni taqdim etadi.
- Render kabi hostingga joylash uchun repozitoriyani hosting hisobiga ulash va konfiguratsiyani tasdiqlash kerak.
- Google OAuth uchun Google Cloud loyihasi, Client ID/Secret, aniq callback URL va administrator emaili kerak.
- Bank, kripto, aksiyalar, xalqaro valyuta, taksi va logistika xizmatlari oddiy UI qo‘shish bilan ishga tushmaydi; litsenziya, shartnoma, API kalitlari, mintaqaviy qonunlar va xavfsizlik auditi talab qilinishi mumkin.
- Barcha foydalanuvchilarga 10 GB bepul xotira yoki har bir pullik foydalanuvchiga 100 TB va’da qilishdan oldin xarajat va sig‘im modeli tasdiqlanishi shart.

## 9. Birinchi amaliy maqsad

Avval serverga joylashtirilgan, autentifikatsiyasi, AI chat API, ma’lumotlar bazasi, administrator paneli, audit va avtomatik testlari tekshirilgan MVPni ishlatish. Shundan keyin har bir modulni alohida qo‘shish va haqiqiy foydalanuvchilar bilan sinash.
