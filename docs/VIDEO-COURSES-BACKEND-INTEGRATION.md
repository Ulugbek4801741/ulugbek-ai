# Video va kurslar: backend ulashga tayyorlash rejasi

## Hozirgi PR
Bu PR UI prototip, PostgreSQL migratsiyasi va API/ulash bo‘yicha shartnomani qo‘shadi. Ilova hozircha migrationni avtomatik qo‘llamaydi va ushbu API endpointlar hali amalga oshirilmagan. Shuning uchun yangi tugmalarni real media yoki pul amallariga ulangan deb hisoblamang.

## Ma’lumotlar bazasi
1. PostgreSQL yaratish va DATABASE_URL ni hosting secret sifatida kiritish.
2. Avval db/schema.sql, keyin db/migrations/20261027_video_courses.sql migratsiyasini review qilib qo‘llash.
3. Zaxira nusxa va restore testini tekshirish.
4. Har bir so‘rov autentifikatsiya qilingan foydalanuvchi IDsi bilan chegaralansin; brauzerdan kelgan owner/user IDga ishonilmasin.

## Media saqlash
- STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_REGION, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY ni hosting secretlarida sozlash.
- Faqat server yaratgan, muddati qisqa signed upload/download URLlardan foydalanish.
- MIME va fayl imzosini tekshirish; hajm limitlari, malware scan, rate limit, private bucket, delete/retention siyosati.
- Download faqat video egasi ruxsat berganida yoki media public-download sifatida belgilanganida.
- Media obyekti kaliti maxfiy hisoblanadi; public URL sifatida bazaga yozilmaydi.

## Taklif etiladigan API kontrakti (hali implementatsiya qilinmagan)
- GET /api/videos?cursor=... — faqat moderatsiyadan o‘tgan va ko‘rishga ruxsat berilgan videolar.
- POST /api/videos/upload-intent — autentifikatsiya, quota va media cheklovlarini tekshirib, qisqa muddatli upload URL qaytaradi.
- POST /api/videos — yuklangan media object keyni video post sifatida ro‘yxatga oladi; dastlab pending moderation.
- POST /api/videos/:id/like va DELETE /api/videos/:id/like — takroriy laykni unique constraint bilan oldini olish.
- GET /api/videos/:id/comments va POST /api/videos/:id/comments — text/voice/video izoh; media uchun upload-intent talab qilinadi.
- POST /api/videos/:id/download-url — egasi ruxsat bergan bo‘lsagina qisqa signed URL.
- POST /api/video-rooms, POST /api/video-rooms/:id/join-token, POST /api/video-rooms/:id/end — WebRTC/SFU provayderiga serverdan token; xona va ishtirokchi ruxsatlari tekshiriladi.
- GET /api/courses, POST /api/courses, PATCH /api/courses/:id — o‘qituvchi faqat o‘z kursini tahrirlaydi; publish uchun admin/moderator tasdig‘i.
- POST /api/courses/:id/lessons va GET /api/courses/:id/lessons — darslar va kirish huquqi.
- POST /api/courses/:id/checkout va POST /api/payments/webhook — faqat to‘lov provayderi tanlanib, webhook imzosi tekshirilgandan keyin. Frontend hech qachon to‘lov muvaffaqiyatli bo‘ldi deb belgilamaydi.

## Xavfsizlik va ishga tushirish tartibi
- API endpointlar foydalanuvchi sessiyasi, CSRF himoyasi (cookie sessiyalarda), input schema, rate limit va audit log bilan himoyalanadi.
- Ovoz/video yozuv faqat foydalanuvchi kamera/mikrofonga ruxsat berganda boshlanadi; bloklash/shikoyat siyosati bo‘ladi.
- Kurslar sotuvga chiqishidan oldin mualliflik huquqi, instructor verification, kontent moderatsiyasi va qaytarish siyosati.
- Pul yig‘ish/komissiya/sotuvchiga to‘lov uchun tegishli mamlakatda ishlashga ruxsat etilgan provayder va huquqiy tekshiruv zarur.
- Feature flaglar default false: VIDEO_UPLOAD_ENABLED=false, VIDEO_CALLS_ENABLED=false, COURSE_PUBLISH_ENABLED=false, COURSE_CHECKOUT_ENABLED=false.
- Adminning server tomondagi ruxsati va alohida tasdiqlashsiz productionga yoqilmaydi.

## Tayyor deb hisoblash mezonlari
- Migratsiya toza test bazasida va backupdan tiklashda muvaffaqiyatli.
- Login, authorization/IDOR, file size/type, rate limit, download ACL, webhook signature va moderation testlari o‘tgan.
- Mobil, desktop va web brauzerlarda media playback va WebRTC testlari.
- Hosting secrets, storage CORS, HTTPS, monitoring, xarajat limitlari va incident/revoke jarayoni tekshirilgan.
- Faqat keyin admin feature flaglarni yoqib, stagingdan productionga chiqaradi.
