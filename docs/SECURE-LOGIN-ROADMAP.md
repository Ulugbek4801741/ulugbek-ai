# ULUGBEK AI — xavfsiz kirish talablari (ishga tushirilmagan)

## Hozirgi holat
Bu hujjat talablar va reja. Yangi email/SMS, Google foydalanuvchi autentifikatsiyasi, biometrika, PINFL/pasport tekshiruvi va foydalanuvchi sessiyalari yoqilmagan. Demo sahifa haqiqiy kod yubormaydi va ma'lumot saqlamaydi. Buni production autentifikatsiya deb ko'rsatmang.

## Tavsiya etilgan kirish bosqichlari
1. **Email yoki Google:** Google Identity Services / OAuth 2.0; foydalanuvchidan Google parolini so'ramaslik. Email kodi faqat tasdiqlangan email provayderi bilan yuborilsin.
2. **Email OTP:** kriptografik xavfsiz 6 xonali kod, serverda faqat hash, 5 daqiqa TTL, bir martalik, resend limit. Web OTP/autofill mavjud bo'lsa yordam beradi; aks holda qo'lda kiritish.
3. **Telefon:** SMS provayder orqali 8 xonali kod; 5 daqiqa TTL, bir martalik, resend cooldown va abuse limitlari. Autofill qurilma/brauzer/provayderga bog'liq.
4. **Ikkinchi bosqich:** foydalanuvchi o'rnatgan parol; Argon2id afzal, scrypt mumkin. PINFL/pasport faqat zarur bo'lsa, vakolatli tekshiruvchi provayder va qonuniy asos bilan; demo sahifa bunday ma'lumot yig'maydi.
5. **Qo'shimcha himoya:** TOTP/WebAuthn passkey yoki platforma biometrikasi. Veb-sayt barmoq izi/yuz tasvirini o'zi olmasin; Android BiometricPrompt yoki WebAuthn ishlatilsin.
6. **Sessiya:** HttpOnly + Secure + SameSite cookie, CSRF himoyasi, sessiya rotatsiyasi va serverda bekor qilish, idle/absolute expiry, qurilmalar ro'yxati.
7. **Bir martalik onboarding:** email/telefon egasi tasdiqlanadi, keyingi kirish siyosati foydalanuvchi yoki admin ruxsati bilan belgilanadi. PINFL majburiy bo'lmasin, agar qonun yoki risk talabi talab qilmasa.

## Xato urinishlar va bloklash
- Har bir bloklash darajasida 5 xato urinishdan keyin 10 daqiqa blok.
- 2-bloklash hodisasidan keyin 5 soat.
- 3 va keyingi bloklash hodisasidan keyin 50 soat.
- Hisob, telefon/email challenge, IP va qurilma signallari birga baholansin; faqat IPga tayanilmasin.
- Hisob mavjudligini oshkor qilmaydigan xabarlar, resend limit va kerak bo'lganda CAPTCHA/risk signal.
- Hisoblagichlar Redis yoki tranzaksion DBda atomik saqlansin; restart bilan nolga tushmasin.

## Admin ruxsati va funksiyalarni yoqish
- Yangi autentifikatsiya, pul harakatlari va mutaxassis agentlar default-deny.
- Bitta bosh administrator kuchli autentifikatsiya va qayta tasdiqdan keyin funksiyalarni alohida feature flag bilan yoqadi.
- Ruxsatlar serverda tekshiriladi; yashirilgan tugma yoki maxfiy URL ruxsat o'rnini bosa olmaydi.
- Agentlar faqat taklif tayyorlaydi; kod, deploy, to'lov yoki tashqi amal uchun alohida ruxsat va inson tasdig'i talab etiladi.

## Majburiy testlar
- Kod 5 daqiqadan keyin eskiradi; noto'g'ri/ishlatilgan kod qayta ishlamaydi; challenge foydalanuvchiga bog'langan.
- 5 xato = 10 min; ikkinchi lockout = 5 h; uchinchi = 50 h; parallel so'rovlar limitni chetlab o'tmaydi.
- Resend eski kodni bekor qiladi; email/telefon almashtirish uchun qayta tasdiq.
- CSRF, session fixation, cookie flags, account enumeration, brute-force, replay va distributed rate-limit testlari.
- OAuth state/nonce va PKCE, email_verified, callback URL allowlist.
- Passkey/biometrika ishlamasa xavfsiz fallback.
- Pasport/PINFL log, analytics yoki demo storage'ga tushmaydi.

## Qabul mezonlari
Haqiqiy SMS/email provider, persistent datastore, unit + integration + abuse tests, monitoring, recovery, privacy/legal review va staging end-to-end sinovi bo'lmaguncha tizim production-ready deb belgilanmaydi.