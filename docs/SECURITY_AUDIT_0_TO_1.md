# ULUGBEK AI — 0-dan xavfsizlik va ishga tushirish auditi

## Muhim holat
Bu hujjat audit ro‘yxati va hozirgi koddan aniqlangan cheklovlarni qayd etadi; u tashqi pentest, sertifikat yoki 100% xavfsizlik kafolati emas.

## Hozirgi server va AI
- `POST /api/chat` `OPENAI_BASE_URL` orqali OpenAI-compatible endpointga ulanadi. Shu sabab Ollama/vLLM kabi o‘zingiz joylashtirgan mos endpoint ishlashi mumkin; endpoint, model nomi, server resurslari va tarmoq sozlamalari hostingda to‘g‘ri berilishi shart.
- `OPENAI_API_KEY` ham, mos `OPENAI_BASE_URL` ham bo‘lmasa, chat demo javob qaytaradi; bu haqiqiy AI inference emas.
- Chat bir necha agentga murojaat qiladi. Ularning hammasi mustaqil model emas: hozirgi implementatsiya bitta sozlangan model endpointini turli promptlar bilan chaqiradi.
- Hozirgi agentlar avtomatik ravishda o‘z kodini o‘zgartirib yoki model og‘irliklarini o‘qitib yubormaydi. Xotiraga yozish modelni qayta o‘qitish emas.

## Xavfsizlik bo‘yicha aniqlangan cheklovlar
- `sessionId` mijoz yuborgan qiymatdan qabul qilinadi; foydalanuvchi autentifikatsiyasi va server tomondagi foydalanuvchiga bog‘langan sessiya isboti bilan himoyalanmagan. Shu sabab shaxsiy chat/xotira uchun production multi-user isolation tasdiqlanmagan.
- Rate limit `express-rate-limit` standart xotira do‘konidan foydalanadi; bir nechta server nusxasida umumiy limit uchun Redis yoki boshqa markazlashgan store kerak.
- Input safety regex filtri faqat birinchi qatlam. U barcha zararli so‘rovlarni aniqlashga kafolat bermaydi va noto‘g‘ri bloklash ham mumkin.
- Admin sessiya bekor qilish ro‘yxati jarayon xotirasida saqlanadi; bir nechta serverda global revoke kafolatlanmaydi.
- AI javobi yoki agent rejasini ishlab chiqarish real tashqi amallarni bajarish bilan bir xil emas. Fayl bajarish, telefon/kompyuter nazorati, to‘lov va xabar yuborish adapterlari alohida sandbox, ruxsat va audit jurnalini talab qiladi.
- Fayl antivirus tekshiruvi, haqiqiy foydalanuvchi hisoblari, PostgreSQL, Redis, 1 GB kvota, 100 TB to‘lovli saqlash va billing production holatida tasdiqlanmagan.

## Ishga tushirishdan oldin majburiy ishlar
1. Serverda autentifikatsiya va imzolangan, muddati tugaydigan sessiya cookie/token joriy qilish; har bir chat/xotira yozuvini user ID bilan bog‘lash.
2. PostgreSQL migratsiyasi, sxema cheklovlari, zaxira nusxa va migratsiya testlari.
3. Ko‘p nusxali deploy uchun Redis rate-limit store; limitlarni foydalanuvchi va IP bo‘yicha sozlash.
4. Admin sessiyalarini umumiy, muddati cheklangan sessiya omborida saqlash; CSRF/origin tekshiruvi va OAuth callback sozlamalarini tekshirish.
5. Self-hosted LLM endpointini server ichki tarmog‘iga cheklash; foydalanuvchi boshqaradigan istalgan URL’ga serverdan fetch qilishga yo‘l qo‘ymaslik (SSRF himoyasi).
6. Agentlar uchun ruxsatlar ro‘yxati, xavfli amallarga inson tasdig‘i, kodni konteyner sandboxda ishga tushirish, tarmoqni cheklash va audit log.
7. Fayl yuklashda hajm/mime/magic-byte tekshiruvi, karantin, malware skaneri; tekshirilmagan faylni ochmaslik yoki bajarmaslik.
8. `npm audit`, secret scanning, SAST, dependency pinning/lockfile, DAST, rate-limit/load test va mustaqil pentest.
9. Privacy policy, data retention, account deletion/export, incident response, accessibility va har bir bozor bo‘yicha qonuniy tekshiruv.

## Qabul mezonlari
- Testlar Node.js 20/22 da muvaffaqiyatli o‘tishi.
- Bir foydalanuvchi boshqa foydalanuvchining chat/xotirasini o‘qiy olmasligi bo‘yicha avtomatlashtirilgan test.
- Invalid/expired session, rate limit, prompt injection, SSRF, XSS, file upload va admin access testlari.
- Self-hosted model bilan haqiqiy integratsiya smoke test; demo fallbackni UI’da aniq ko‘rsatish.
- Android APK artefakti yig‘ilishi va real qurilmada o‘rnatish sinovi; iOS/Windows uchun alohida build va platforma testlari.
- Barcha qabul mezonlari bajarilmaguncha global production-ready yoki 100% xavfsiz deb e’lon qilmaslik.