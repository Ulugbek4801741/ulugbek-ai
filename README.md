# ULUGBEK AI — Web MVP

Birinchi web MVP uchun xavfsizroq boshlang‘ich loyiha. Bu hali to‘liq AI mahsuloti emas: chat endpoint hozircha demo javob qaytaradi.

## Hozir mavjud

- Uzbek tilidagi sodda chat interfeysi
- Node.js + Express backend
- `GET /api/health` server holatini tekshiradi
- `POST /api/chat` demo chat endpointi
- Helmet xavfsizlik sarlavhalari
- API so‘rovlari uchun rate limit
- Xabar hajmini tekshirish
- Node.js test runner orqali API smoke-testlar

## Ishga tushirish

Talab: Node.js 20 yoki undan yangisi.

```bash
npm install
npm start
```

Brauzerda `http://localhost:3000` manzilini oching.

## Testlar

```bash
npm test
```

Testlarni ishga tushirishdan oldin `npm install` bajarilgan bo‘lishi kerak.

## Muhim cheklovlar

- Hali haqiqiy AI/LLM ulanmagan.
- Hali foydalanuvchi ro‘yxatdan o‘tishi, kirishi yoki ma’lumotlar bazasi yo‘q.
- Hozircha ishlab chiqarish (production) muhiti uchun tayyor deb hisoblanmasin.
- Ommaviy internetga joylashdan oldin autentifikatsiya, maxfiy sozlamalar, loglash, ma’lumotlarni saqlash va xavfsizlik tekshiruvlari qo‘shilishi kerak.
- Hech qachon API kalitlari yoki parollarni GitHub’ga joylamang.

## Keyingi bosqichlar

1. Loyiha talablarini va arxitekturani aniqlash.
2. Haqiqiy AI provayderini server tomondan xavfsiz ulash.
3. Foydalanuvchi autentifikatsiyasi va ma’lumotlar bazasi.
4. Agentlarni nazorat qilinadigan, ruxsatga asoslangan vositalar bilan qurish.
5. Testlar, xavfsizlik ko‘rigi va deployment.
6. Oflayn model/telefon bilan integratsiya imkoniyatlarini alohida tekshirish.
