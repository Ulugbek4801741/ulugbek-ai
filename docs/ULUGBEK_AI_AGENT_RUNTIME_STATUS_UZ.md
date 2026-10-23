# ULUGBEK AI agent navbati — hozirgi holat

## Nima qo‘shildi
- Himoyalangan admin API: `GET/POST /api/admin/tasks`, `GET /api/admin/tasks/:id`, `POST /api/admin/tasks/:id/cancel`, `POST /api/admin/tasks/:id/review`.
- Admin sahifasida mutaxassis tanlash, topshiriq yuborish, holat/xato/jurnal/natijani ko‘rish va ko‘rib chiqish qarori.
- Bir server jarayonida bitta vazifani navbat bilan bajaruvchi ishchi.
- Model javobi vazifa natijasi sifatida saqlanadi. Model sozlanmagan bo‘lsa, vazifa `blocked` bo‘ladi; soxta natija yaratilmaydi.
- Model chiqargan taklif kod sifatida bajarilmaydi. Bu versiya fayllarni o‘zgartirmaydi, shell buyruqlarini bajarmaydi, testlarni avtomatik ishga tushirmaydi va deploy qilmaydi.

## Ishga tushirish uchun majburiy sozlamalar
1. GitHub repozitoriyni Render kabi Node.js server hostingiga ulang; GitHub Pages faqat statik sahifani beradi, API va ishchi jarayonni ishga tushirmaydi.
2. Hostingda `PUBLIC_BASE_URL=https://SIZNING-HAQIQIY-RENDER-MANZILINGIZ` ni belgilang.
3. Google OAuth uchun `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_GOOGLE_EMAIL`, `ADMIN_SESSION_SECRET` ni hostingning maxfiy environment sozlamalarida kiriting. Google OAuth callback URL: `https://SIZNING-HAQIQIY-RENDER-MANZILINGIZ/api/auth/google/callback`.
4. Haqiqiy AI uchun `OPENAI_API_KEY` (provayder kaliti) yoki `OPENAI_BASE_URL` (OpenAI-compatible model endpointi) va zarur bo‘lsa `OPENAI_MODEL` ni sozlang. Kalitni brauzerga yoki GitHub kodiga yozmang.
5. Server ishga tushgach, o‘sha server manzilidagi `/admin.html` ni ochib, ruxsat berilgan Google hisobi bilan kiring.

## Hozircha bajarilmagan, shu sabab 24/7 deb bo‘lmaydi
- Bu ishchi server jarayoni ichida ishlaydi; server uxlab qolsa, o‘chsa yoki qayta deploy qilinsa, bajarish uziladi. Bu mustaqil doimiy xizmat emas.
- Vazifalar mahalliy JSON faylida saqlanadi. Ephemeral hostingda restart/deploy vaqtida ma’lumot yo‘qolishi mumkin. Ishonchli ishlab chiqarish uchun PostgreSQL va alohida navbat/worker (masalan Redis asosidagi) zarur.
- Hozircha 100 ta mustaqil agent emas; bir vaqtning o‘zida bitta vazifani tanlangan rol prompti bilan bajaradigan navbat.
- Avtomatik kod o‘zgartirish, sandbox ichida test, GitHub branch/PR, review gate va tasdiqlangan deploy hali yo‘q.
- Admin ko‘rib chiqish tugmasi qarorni qayd qiladi; kodni qo‘llamaydi.
- Ushbu commitlardan keyingi GitHub Actions natijasi va real hostingda OAuth/model bilan end-to-end sinov tasdiqlanmaguncha tizimni “hammasi ishladi” deb belgilamang.

## Xavfsizlik
- Tashqi tizimlarda qaytarib bo‘lmaydigan amallar faqat keyingi versiyada aniq ruxsat va inson tasdig‘i bilan qo‘shilishi kerak.
- Agent matnini hech qachon bevosita shell yoki eval orqali bajarmang.
