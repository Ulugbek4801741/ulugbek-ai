# ULUGBEK AI agent navbati — hozirgi holat

## Nima qo‘shildi
- Himoyalangan admin API: `GET/POST /api/admin/tasks`, `GET /api/admin/tasks/:id`, `POST /api/admin/tasks/:id/cancel`, `POST /api/admin/tasks/:id/review`.
- Admin sahifasida mutaxassis tanlash, topshiriq yuborish, holat/xato/jurnal/natijani ko‘rish va ko‘rib chiqish qarori.
- Bir server jarayonida bitta vazifani navbat bilan bajaruvchi ishchi.
- Boshqaruvchi rol tanlanganda 5 ta mutaxassis tahlili (tadqiqot, backend, interfeys, sinov, xavfsizlik) va yakuniy jamlash bosqichi ketma-ket ishlaydi.
- Topshiriq navbatga yozilgandan keyingina API qabul qilinganini bildiradi; server ishga tushishida navbat fayli o‘qilishi kutiladi.
- Model javobi vazifa natijasi sifatida saqlanadi. Model sozlanmagan bo‘lsa, vazifa `blocked` bo‘ladi; soxta natija yaratilmaydi.
- Model chiqargan taklif kod sifatida bajarilmaydi. Bu versiya fayllarni o‘zgartirmaydi, shell buyruqlarini bajarmaydi, testlarni avtomatik ishga tushirmaydi va deploy qilmaydi.

## Ishga tushirish uchun majburiy sozlamalar
1. GitHub repozitoriyni Render kabi Node.js server hostingiga ulang; GitHub Pages faqat statik sahifani beradi, API va ishchi jarayonni ishga tushirmaydi.
2. Hostingda `PUBLIC_BASE_URL=https://SIZNING-HAQIQIY-RENDER-MANZILINGIZ` ni belgilang.
3. Google OAuth uchun `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_GOOGLE_EMAIL`, `ADMIN_SESSION_SECRET` ni hostingning maxfiy environment sozlamalarida kiriting. Google OAuth callback URL: `https://SIZNING-HAQIQIY-RENDER-MANZILINGIZ/api/auth/google/callback`. Render disk hujjati: https://render.com/docs/disks. Worker hujjati: https://render.com/docs/background-workers. Workflows: https://render.com/docs/workflows.
4. Haqiqiy AI uchun `OPENAI_API_KEY` (provayder kaliti) yoki `OPENAI_BASE_URL` (OpenAI-compatible model endpointi) va zarur bo‘lsa `OPENAI_MODEL` ni sozlang. Kalitni brauzerga yoki GitHub kodiga yozmang.
5. Server ishga tushgach, o‘sha server manzilidagi `/admin.html` ni ochib, ruxsat berilgan Google hisobi bilan kiring.

## Hozircha bajarilmagan, shu sabab 24/7 deb bo‘lmaydi
- Bu ishchi server jarayoni ichida ishlaydi; server uxlab qolsa, o‘chsa yoki qayta deploy qilinsa, bajarish uzilishi mumkin. Bu mustaqil doimiy xizmat emas. Render hujjatlarida uzluksiz vazifalar uchun alohida Background Worker/queue, uzoq zanjirli ishlar uchun Workflows tavsiya etiladi.
- Vazifalar mahalliy JSON faylida saqlanadi. Ephemeral hostingda restart/deploy vaqtida ma’lumot yo‘qolishi mumkin. Ishonchli ishlab chiqarish uchun PostgreSQL va alohida navbat/worker (masalan Redis asosidagi) zarur.
- Hozircha 100 ta mustaqil agent emas; bir vaqtning o‘zida bitta vazifani tanlangan rol prompti bilan bajaradigan navbat.
- Avtomatik kod o‘zgartirish, sandbox ichida test, GitHub branch/PR, review gate va tasdiqlangan deploy hali yo‘q.
- Admin ko‘rib chiqish tugmasi qarorni qayd qiladi; kodni qo‘llamaydi.
- Ushbu commitlardan keyingi GitHub Actions natijasi va real hostingda OAuth/model bilan end-to-end sinov tasdiqlanmaguncha tizimni “hammasi ishladi” deb belgilamang.

## Xavfsizlik
- Tashqi tizimlarda qaytarib bo‘lmaydigan amallar faqat keyingi versiyada aniq ruxsat va inson tasdig‘i bilan qo‘shilishi kerak.
- Agent matnini hech qachon bevosita shell yoki eval orqali bajarmang.

## 14 000 ta xizmat maqsadi haqida
14 000 ta to‘liq, xavfsiz, mustaqil va global foydalanuvchilarga xizmat qiladigan ilovani bir oyda yaratish va ishga tushirishni hozirgi MVP yoki bir nechta agent bilan kafolatlab bo‘lmaydi. Bir oyda erishish mumkin bo‘lgan aniqroq maqsad — xizmatlar katalogi, takror ishlatiladigan ilova shablonlari, generator, testlar va kichik miqdordagi haqiqiy pilot ilovalar. Har bir alohida ilovaga talablar, xavfsizlik, ma’lumotlar ombori, hosting, monitoring, maxfiylik va foydalanuvchi sinovlari kerak. Son emas, ishlaydigan sifatli pilotlar asosiy mezon bo‘lsin.
