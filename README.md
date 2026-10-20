# ULUGBEK AI — Web va Android MVP

Bu loyiha ULUGBEK AI ning dastlabki ishlaydigan interfeysi va Android APK yaratish uchun boshlang‘ich asosidir. Hozirgi chat **haqiqiy AI emas**: server demo javob qaytaradi, Android ilova esa oflayn demo rejimida ishlay oladi.

## Mavjud imkoniyatlar

- Mobil qurilmaga mos o‘zbekcha chat interfeysi.
- Express backend: `GET /api/health` va `POST /api/chat`.
- Helmet orqali Content Security Policy va boshqa xavfsizlik sarlavhalari.
- API rate limit va xabar hajmi tekshiruvi.
- Oflayn web app-shell uchun service worker.
- PWA manifest va ilova belgisi.
- Capacitor orqali Android ilova qobig‘i.
- GitHub Actions orqali debug APK yig‘ish va artifact sifatida berish.

## Web-serverni ishga tushirish

Talab: Node.js 20 yoki undan yangi versiya.

```bash
npm install
npm start
```

Brauzerda `http://localhost:3000` ni oching.

## Testlar

```bash
npm test
```

## Android APK yaratish

GitHub repository ichidagi **Actions → Build Android APK → Run workflow** orqali yig‘ishni qo‘lda boshlash mumkin. Workflow tugagach, muvaffaqiyatli ish natijasidagi **Artifacts** bo‘limidan `ulugbek-ai-debug-apk` faylini yuklab oling. Bu sinov uchun debug APK; Play Store uchun tayyor imzolangan release APK emas.

Workflow `mvp/initial-scaffold` tarmog‘idagi kodni yig‘adi. O‘zgarishlar asosiy `main` tarmog‘iga hali avtomatik birlashtirilmaydi.

## Muhim cheklovlar va keyingi ishlar

- Haqiqiy LLM/AI modeli hali ulanmagan.
- Foydalanuvchi ro‘yxatdan o‘tishi, autentifikatsiya va ma’lumotlar bazasi hali yo‘q.
- Android demo rejimida xabarlar serverga yuborilmaydi; haqiqiy AI uchun xavfsiz backend endpointi kerak.
- Hali production uchun tayyor emas. Internetga ochishdan oldin autentifikatsiya, maxfiy sozlamalar, loglash, ma’lumotlar bazasi, monitoring va xavfsizlik tekshiruvlari zarur.
- API kalitlari, parollar va boshqa maxfiy ma’lumotlarni GitHub’ga joylamang.
- APK workflow bajarilmaguncha tayyor APK yaratilgan deb hisoblanmaydi.

## Rejalashtirilgan bosqichlar

1. CI build va test natijalarini tekshirish.
2. Haqiqiy AI modelini backend orqali ulash.
3. Ro‘yxatdan o‘tish/kirish va ma’lumotlar bazasi.
4. Agentlar uchun cheklangan, tekshiriladigan vositalar.
5. Release imzolash, xavfsizlik auditi va hosting.
6. Oflayn kichik modelni Android qurilmada ishlatish imkoniyatini tekshirish.
