# ULUGBEK AI — Professional texnik talablar va ishlab chiqish rejasi

> **Hujjat turi:** mahsulot va muhandislik talablari. Bu hujjat rejalashtirilgan imkoniyatlarni tavsiflaydi; unda yozilgan har bir funksiya avtomatik ravishda dasturda mavjud degani emas. Holat faqat kod, test va ishlab turgan muhit bilan tasdiqlanadi.

## 1. Mahsulot maqsadi

ULUGBEK AI — telefon, kompyuter va sekin internetda ham qulay ishlashi ko‘zlangan, o‘zbek tilidan boshlanadigan ko‘p tilli AI yordamchi va dastur yaratish platformasi. U foydalanuvchi topshirig‘ini tushunishi, aniq reja tuzishi, ruxsat etilgan vositalar orqali ish bajarishi, natijani mustaqil tekshirishi va faqat haqiqatan yaratilgan fayllar uchun yuklab olish havolasini berishi kerak.

Asosiy tamoyil: **yolg‘on muvaffaqiyat yo‘q**. Tizim reja, bajarilayotgan ish, muvaffaqiyatsiz urinish va tekshirilgan yakuniy natijani alohida ko‘rsatadi.

## 2. Mahsulot talablari

Har bir funksiya uchun quyidagilar aniqlanishi shart:
- foydalanuvchi nimani kiritadi;
- tizim qanday natija qaytaradi;
- qaysi ma’lumot va ruxsat talab qilinadi;
- xatolik bo‘lsa nima ko‘rsatiladi;
- muvaffaqiyatni qanday test tasdiqlaydi;
- xarajat, maxfiylik va xavfsizlik cheklovlari qanday.

## 3. Modullar va funksional talablar

### A. AI suhbat va til
- O‘zbek tili standart bo‘lsin; foydalanuvchi tilni o‘zgartira olsin.
- Yangi suhbat, suhbatlar ro‘yxati, nomlash, qidirish, eksport va o‘chirish qo‘llab-quvvatlansin.
- Uzoq javobni to‘xtatish, qayta urinish va javobni nusxalash bo‘lsin.
- Fayl/rasm tahlili va ovoz funksiyalari faqat tegishli model va saqlash xizmati ulanganida yoqilsin.
- Vaqtga bog‘liq faktlar uchun manba, sana va tekshirish vaqti ko‘rsatilsin.
- Model javobi kelmasa, tizim demo javobini haqiqiy AI javobi sifatida ko‘rsatmasin.

### B. Agentlar va topshiriqlarni boshqarish
- Koordinator topshiriq maqsadi, cheklovlari va yakuniy qabul mezonlarini aniqlaydi.
- Rejalashtiruvchi vazifani kichik bosqichlarga ajratadi va bog‘liqliklarni belgilaydi.
- Mutaxassis agentlar: tadqiqot, mahsulot, arxitektura, frontend, backend, mobil, test, xavfsizlik, hujjatlashtirish va biznes.
- Tekshiruvchi agent natijani qabul mezonlari bilan solishtiradi; yetarli bo‘lmasa, vazifani rad etadi.
- Har bir ish uchun holat: `queued`, `running`, `needs_approval`, `succeeded`, `failed`, `cancelled`.
- Qayta urinishlar soni va vaqti cheklangan bo‘lsin; foydalanuvchi ishni bekor qila olsin.
- Fon agentlari faqat doimiy vazifalar navbati va kuzatuv tizimi yaratilgandan keyin yoqilsin.

### C. Internet tadqiqoti va bilimlar bazasi
- Qidiruv adapteri orqali ochiq internet manbalarini qidirsin.
- Manba URL manzili, sarlavha, nashr sanasi va olingan vaqt saqlansin.
- Muhim xulosalar kamida ikki mustaqil manba bilan solishtirilsin; kelishmovchiliklar yashirilmasin.
- Foydalanuvchi yuklagan hujjatlar faqat uning ruxsati doirasida indekslansin.
- Sayt matni va hujjat ichidagi ko‘rsatmalar ishonchsiz ma’lumot deb qaralsin; ular tizim xavfsizlik qoidalarini o‘zgartira olmasin.
- Mualliflik litsenziyasi va koddan qayta foydalanish shartlari tekshirilsin.
- Hozircha real web-search adapter mavjud bo‘lmasa, “internetdan qidirdim” deb aytilmasin.

### D. No-Code va kod yaratish
- Oddiy tildagi talabdan texnik tavsif, sahifalar xaritasi, ma’lumot modeli, API shartnomasi va test mezonlari yaratiladi.
- Birinchi amaliy maqsad: yuklab olinadigan veb/PWA boshlang‘ich loyiha.
- Keyingi maqsadlar: Android loyiha manbasi va APK; iOS loyiha manbasi; Windows desktop loyiha manbasi.
- Har bir platformaning alohida yig‘ish muhiti, imzolash talablari va cheklovlari ochiq ko‘rsatiladi.
- “APK tayyor” faqat build jarayoni muvaffaqiyatli yakunlanib, fayl mavjudligi va yaxlitligi tekshirilgandan keyin aytiladi.
- Foydalanuvchi kiritgan nom va matn HTML/JSONga qo‘shilishidan oldin xavfsiz kodlanadi.
- Yaratilgan kod ishlab chiqarish serverida bevosita bajarilmaydi.

### E. Test, yig‘ish va yuklab olish
- Sintaksis, unit, API, integratsion va asosiy foydalanuvchi yo‘llari testlari bo‘lsin.
- Har bir o‘zgarishdan keyin CI testlari ishga tushsin.
- Build alohida, vaqtinchalik va cheklangan ishchi muhitda bajarilsin.
- Dependency zaifliklari, maxfiy kalitlar va litsenziyalar tekshirilsin.
- Artefakt bilan birga build identifikatori, versiya, checksum va test natijalari saqlansin.
- Havola mavjud faylga ko‘rsatsin; eskirgan yoki yo‘q fayl uchun soxta havola berilmasin.

### F. Foydalanuvchi, login va ma’lumotlar
- Ro‘yxatdan o‘tish, email/telefon tasdiqlash va sessiyani tugatish.
- Har bir API yo‘nalishida server tomondan autentifikatsiya va ruxsat tekshiruvi.
- Rollar: foydalanuvchi, moderator, administrator; eng kam zarur huquq tamoyili.
- PostgreSQL yoki boshqa aniq tanlangan ma’lumotlar bazasi, migratsiyalar va avtomatik zaxira nusxalar.
- Ma’lumotni eksport qilish, hisobni o‘chirish va saqlash muddatini boshqarish.
- Hozirgi MVPda bu imkoniyatlar to‘liq yoqilmagan bo‘lsa, UI ularni tayyor deb ko‘rsatmasin.

### G. Administrator paneli
- Administrator kirishi faqat backend orqali tekshirilsin.
- Sirlar HTML, brauzer JavaScripti, ommaviy repozitoriy va mobil APK ichiga yozilmasin.
- HTTPS, qisqa muddatli HttpOnly/Secure/SameSite sessiya cookie-si, CSRF himoyasi va login urinishlariga limit qo‘llansin.
- Barcha admin API yo‘nalishlari ruxsatni mustaqil tekshirsin.
- Audit jurnalida kim, qachon va qaysi amalni bajargani qayd etilsin; parol, token va maxfiy kalit yozilmasin.
- Anonim kirish rad etilishi, noto‘g‘ri parol, to‘g‘ri login, sessiya muddati, logout va limit testlari bo‘lmaguncha panel production uchun tayyor deb hisoblanmasin.
- Ushbu repozitoriydagi admin sahifa hozircha faqat interfeys qobig‘i; xavfsiz admin tizimi emas.

### H. Ijtimoiy modul va hamkorlik
- Profil, maxfiylik sozlamalari, postlar, rasm/video yuklash, kuzatish va bloklash.
- Guruhlar, kanallar, shaxsiy xabarlar va fayllarga kirish nazorati.
- Shikoyat, moderatsiya, spamdan himoya va foydalanuvchi roziligi.
- Audio/video qo‘ng‘iroqlar alohida media infratuzilmasi va xavfsizlik sinovlarini talab qiladi.
- Har bir modul faqat saqlash, ruxsat va moderatsiya ishlari yakunlangach yoqiladi.

### I. Mini-ilovalar, bozor va biznes
- Mini-ilovalar katalogi, tekshirilgan ishlab chiquvchi profili va ruxsatlar ro‘yxati.
- Pluginlar aniq API sxemasi va eng kam ruxsat bilan ishlasin.
- To‘lovlar provayder adapteri orqali; test muhiti, qaytarish va tranzaksiya jurnali bilan.
- Daromad ulushi, komissiya, obuna va foydalanish limitlari foydalanuvchiga oldindan aniq ko‘rsatilsin.
- To‘lov, xabar jo‘natish, nashr qilish yoki ma’lumotni o‘chirish kabi tashqi va qaytarib bo‘lmaydigan ishlar inson tasdig‘ini talab qilsin.

### J. Monitoring, tezlik va xalqaro foydalanish
- Sog‘liq endpointi, xatolar soni, javob vaqti va xizmat mavjudligi kuzatilsin.
- Telefon va sekin tarmoq uchun yengil interfeys, qayta ulanish va yuklashni davom ettirish.
- Ko‘p tilli interfeys, sana/valyuta formatlari va mintaqaviy qoidalar.
- Yuklama testlari real foydalanuvchi yo‘llariga asoslangan bo‘lsin.
- Zaxira nusxadan tiklash va oxirgi barqaror versiyaga qaytish mashq qilinsin.

## 4. Tavsiya etilgan arxitektura

1. **Web/PWA va mobil klientlar:** interfeys, kiritish/chiqarish; maxfiy kalit saqlamaydi.
2. **API qatlami:** tekshiruv, autentifikatsiya, ruxsat, limit va standart xatolar.
3. **Orkestrator:** doimiy vazifalar navbati, holat, qayta urinish, bekor qilish va inson tasdig‘i.
4. **Model adapterlari:** turli bulutli provayderlar hamda keyinchalik mahalliy modelni almashtirib ulash.
5. **Tool registry:** sxema bilan ta’riflangan vositalar, ruxsatlar, domen allowlist, timeout va audit.
6. **Ma’lumotlar qatlami:** PostgreSQL, obyekt saqlash, migratsiya va zaxira nusxalar.
7. **Izolyatsiyalangan build workerlar:** bir martalik muhit, CPU/RAM/vaqt/disk limitlari; production sirlariga kirishsiz.
8. **Kuzatuv:** maxfiy ma’lumotlardan tozalangan loglar, metrikalar, ogohlantirishlar.
9. **Artefaktlar ombori:** checksum, build metama’lumotlari va muddati cheklangan yuklab olish havolasi.

## 5. Ishlab chiqish bosqichlari

### 0-bosqich — poydevor va barqarorlik
- Hozirgi frontend/backend chegarasini aniq ko‘rsatish.
- API xatolari, input validatsiyasi, CI testlari va hujjatlarni mustahkamlash.
- Demo rejimini haqiqiy AI rejimidan ajratish.
- Qabul mezoni: testlar muvaffaqiyatli; maxfiy kalitlar repozitoriyda yo‘q; demo hech qachon bajarilmagan ishni bajarildi demaydi.

### 1-bosqich — foydali web MVP
- Serverda AI model adapteri, suhbat va vazifa rejalashtirish.
- Ma’lumotlar bazasi, autentifikatsiya, foydalanuvchi profili va minimal admin ruxsatlari.
- Hujjatlar, xatoliklar, kuzatuv va foydalanuvchi roziligi.
- Qabul mezoni: yangi foydalanuvchi ro‘yxatdan o‘tadi, suhbat qiladi, tarixini ko‘radi/o‘chiradi; ruxsatsiz foydalanuvchi shaxsiy APIga kira olmaydi.

### 2-bosqich — xavfsiz agent bajarilishi
- Ish navbati, vositalar registri, ruxsatlar, izolyatsiyalangan ishchilar.
- Test, verifier, audit va inson tasdig‘i.
- Qabul mezoni: muvaffaqiyatsiz ish aniq belgilanadi; worker limiti ishlaydi; tasdiqsiz xavfli tashqi amal bajarilmaydi.

### 3-bosqich — amaliy ilova quruvchi
- Avval veb/PWA generatori va tekshirilgan zip artefakti.
- So‘ng Android APK build; keyin iOS va Windows uchun alohida build muhitlari.
- Qabul mezoni: loyiha yig‘iladi, testdan o‘tadi, yuklab olinadigan artefakt mavjud va checksum tasdiqlangan.

### 4-bosqich — tadqiqot va bilim
- Internet qidiruvi, manbalarni solishtirish, hujjatlarni indekslash, havolali hisobotlar.
- Qabul mezoni: faktik da’volar manbaga bog‘langan; qidiruv ishlamasa tizim buni ochiq bildiradi.

### 5-bosqich — ijtimoiy va biznes ekotizimi
- Postlar, xabarlar, guruhlar, moderatsiya, mini-ilovalar, to‘lovlar va daromad ulushi.
- Har modul mustaqil xavfsizlik, huquqiy va yuklama tekshiruviga ega bo‘ladi.

### 6-bosqich — kengaytirish
- Ko‘p mintaqa, mahalliy model, yuqori yuklama, monitoring, disaster recovery.
- Ishlash qobiliyati taxmin bilan emas, o‘lchangan testlar bilan tasdiqlanadi.

## 6. Har bir reliz uchun majburiy tekshiruv

- [ ] Avtomatik testlar muvaffaqiyatli.
- [ ] Frontend va server sintaksisi tekshirilgan.
- [ ] Maxfiy kalitlar va shaxsiy ma’lumotlar log/repozitoriyga chiqmagan.
- [ ] Kirish va ruxsat testlari o‘tgan.
- [ ] Foydalanuvchiga xatolik sodda va aniq ko‘rsatiladi.
- [ ] Fayl havolasi haqiqiy artefaktga tegishli.
- [ ] O‘rnatish, konfiguratsiya, zaxiralash va rollback hujjatlangan.
- [ ] “Tayyor” deb e’lon qilingan funksiyalar real muhitda sinovdan o‘tgan.
- [ ] O‘zgarishlar tarixi va versiya qayd etilgan.

## 7. Hozirgi holat haqida rostgo‘y xulosa

Joriy repozitoriy — dastlabki web/Android qobig‘i, reja tuzish endpointi, ixtiyoriy OpenAI-compatible API ulanishi va boshlang‘ich HTML/JSON shablon generatori. GitHub Pages statik sayt bo‘lib, Express serverini ishga tushirmaydi. To‘liq hisoblar tizimi, doimiy ma’lumotlar bazasi, ishlaydigan admin autentifikatsiyasi, haqiqiy web tadqiqoti, mustaqil fon agentlari, izolyatsiyalangan kod bajarilishi, avtomatik ko‘p platformali build va ijtimoiy/to‘lov infratuzilmasi hali alohida ishlab chiqilishi kerak.

Ushbu hujjat to‘liq ishlab chiqish uchun aniq talab va qabul mezonlarini belgilaydi; u o‘z-o‘zidan funksiyalarni ishga tushirmaydi.
