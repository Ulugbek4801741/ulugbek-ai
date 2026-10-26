# ULUGBEK AI — Xavfsizlik tekshiruvi (2026-10-26)

Bu hujjat kodni ko‘rib chiqish natijasi; u mustaqil pentest, sertifikat yoki 100% xavfsizlik kafolati emas.

## Hozir mavjud himoyalar
- Express Helmet xavfsizlik sarlavhalari.
- JSON so‘rov tanasi 20 KB bilan cheklangan.
- Umumiy API, chat va rejalashtiruvchi uchun rate limitlar.
- Chat kirishida `modules/input-safety` tekshiruvi.
- AI so‘rovlari uchun timeout; admin marshrutlarining bir qismi `requireAdmin` bilan himoyalangan.
- `modules/workflow-gate.js` xavfli tashqi amallarni avtomatik bajarishga ruxsat bermaydi; haqiqiy adapterlar alohida tekshiruv talab qiladi.

## Ko‘rib chiqishda aniqlangan muhim cheklovlar
1. **AI backend:** `OPENAI_API_KEY` va `OPENAI_BASE_URL` sozlanmagan bo‘lsa `/api/chat` demo javob qaytaradi; bu haqiqiy LLM emas. O‘z serveridagi Ollama/vLLM OpenAI-compatible endpoint sifatida sozlansa, ulanish mumkin. Bu o‘z-o‘zidan modelni o‘qitmaydi.
2. **Sessiya va hisob:** brauzer yuborgan `sessionId` xotira ajratish uchun ishlatiladi; bu to‘liq foydalanuvchi autentifikatsiyasi o‘rnini bosa olmaydi. Shaxsiy ma’lumotli ishlab chiqarish tizimi uchun server tasdiqlaydigan sessiya va ruxsatlar kerak.
3. **Doimiy xotira:** agent xotirasi JSON fayl prototipi; ko‘p serverli ishlab chiqarish, zaxira nusxa, tiklash va ma’lumotni o‘chirish jarayoni tasdiqlanmagan.
4. **Fayl/antivirus:** real APK skaneri va yuklangan fayllar uchun izolyatsiyalangan tahlil pipeline mavjudligi tasdiqlanmagan. Faqat tashqi antivirus havolasi antivirus emas.
5. **Pul va saqlash:** 1 GB kvota, 100 TB pullik tarif, to‘lov, billing, qaytarish va xarajat cheklovlari ishlaydigan backend sifatida ulanmagan.
6. **Tarmoq va avtomatlashtirish:** universal telefon/kompyuter boshqaruvi, ijtimoiy tarmoq moderatsiyasi, spam/firibgarlikni to‘liq aniqlash va 14 000 integratsiya mavjud emas.
7. **Mahsulot sinovlari:** CI muvaffaqiyati faqat shu CI bajaradigan testlarni bildiradi. Qurilma sinovlari, yuklama sinovi, mustaqil penetratsion test va barcha platformalar tasdig‘i alohida bajarilishi kerak.

## Jinoyatchilik va hujumlarga qarshi ishlab chiqarish talablar
- Har bir hisob uchun server tomonida autentifikatsiya, eng kam huquq tamoyili, MFA/admin himoyasi va audit jurnali.
- Har bir tashqi amal oldidan aniq ko‘rsatilgan inson roziligi; rozilikni bekor qilish va barcha tokenlarni bekor qilish imkoniyati.
- Foydalanuvchi fayllari uchun tur/haqiqiy MIME/magic-byte tekshiruvi, hajm chegarasi, zararli fayllarni karantinga olish, xavfsiz nomlash, antivirus sandbox va hech qachon avtomatik o‘rnatmaslik.
- SSRF himoyasi: foydalanuvchi kiritgan URL yoki `OPENAI_BASE_URL` ni tekshirish; localhost, private IP, cloud metadata va ichki tarmoqlarga so‘rovlarni to‘sish. Self-hosted endpoint faqat administratorning aniq konfiguratsiyasi bilan ruxsat etilsin.
- Maxfiy kalitlarni secret manager/environment orqali saqlash; hech qachon browser JS, Git yoki loglarda chiqarib yubormaslik.
- CORS allowlist, cookie Secure/HttpOnly/SameSite, CSRF himoyasi va production HTTPS.
- SQL/command injection, XSS, IDOR, privilege escalation, rate-limit bypass, prompt injection va agent tool abuse uchun testlar.
- Abuse-report, spam/soxta akkauntni tekshirish, bloklash/apellyatsiya, moderatsiya va hodisaga javob berish jarayoni.
- Moliyaviy balansni haqiqiy bank/depozit yoki kripto aktiv deb ko‘rsatmaslik; huquqiy va xavfsizlik auditisiz saqlanadigan qiymat/transfer tizimini ishga tushirmaslik.

## Global bozorga chiqishdan oldingi to‘siqlar
- Mustaqil security review va penetration test.
- Maxfiylik siyosati, foydalanish shartlari, data retention/deletion, yosh cheklovlari va davlatlar bo‘yicha huquqiy tekshiruv.
- Yuklama/availability testlari, backup-restore mashqi, monitoring, incident response va recovery maqsadlari.
- Modelning litsenziyasi, vaznlarini tijoriy ishlatish huquqi va har bir modelning haqiqiy resurs talabi tekshirilishi.

## Xavfsizlik qoidasi
Agentlar o‘z nusxalarini cheksiz yaratmasin, o‘z kodini productionga inson tasdig‘isiz joylamasin, ruxsatsiz tizimlarga kirmasin, zaiflikni real tizimda ekspluatatsiya qilmasin va foydalanuvchi ma’lumotini roziliksiz boshqa modelga yubormasin. Ko‘paytirish o‘rniga vazifalar navbati, xarajat limiti, agent soni limiti, sandbox va tekshiruv ishlatilsin.