# ULUGBEK AI — tekshiruv holati

Tekshiruv sanasi: 2026-10-27.

## GitHub Actions
- Wallet prototipi PR #14 head commit `abaf57ad932f340aff3d8d0a3742112073517b14`: **ULUGBEK AI CI — success**, **ULUGBEK AI Tests — success**.
- Bu faqat ushbu commitdagi avtomatik CI/testlar muvaffaqiyatli tugaganini bildiradi; email/SMS, brauzerlar, mobil qurilmalar, to‘lovlar yoki hosting end-to-end ishlashini tasdiqlamaydi.
- PR #13 admin paroli va sessiya kodi draft va merge qilinmagan; production muhitida sozlanganini tasdiqlovchi dalil yo‘q.

## Aniqlangan muhim kamchiliklar
- PR #13 da 5 xatodan so‘ng 15 daqiqa blok; bu yangi talabdagi 10 daqiqa / 5 soat / 50 soat bosqichlariga mos emas.
- Bloklash hisoblagichi va bekor qilingan sessiyalar jarayon xotirasida; restart yoki bir nechta server nusxasida chetlab o‘tilishi mumkin.
- Parol bilan login ADMIN_PASSWORD_HASH va ADMIN_SESSION_SECRET sozlanmaguncha 503 qaytaradi.
- Sahifa yashirilganda logout yuboriladi, lekin brauzer/tarmoq ishlamasa kafolatlanmaydi; serverdagi sessiya muddati zaxira himoyasi.
- Wallet sahifasi haqiqiy to‘lov qilmaydi va asosiy menyuga ulanmagan.
- Auth preview faqat disabled dizayn; email/SMS, onboarding, PINFL/pasport tekshiruvi va biometrika yoqilmagan.
- Hosting, Android/iOS qurilma sinovi va provayder sandbox sinovi bajarilmagan.

## Production bloklovchilari
1. Umumiy saqlash ombori va atomik lockout/rate limit.
2. Email va SMS provayderlari.
3. Google OAuth/OIDC sozlamalari va recovery oqimi.
4. Passkey/WebAuthn yoki Android BiometricPrompt native integratsiyasi.
5. Unit/integration/abuse testlar va staging E2E.
6. Maxfiylik, saqlash muddati, qonuniy va xavfsizlik ko‘rigi.
7. Bosh admin uchun server-side feature flags va audit.

Hech qanday PR avtomatik merge qilinmadi yoki production serverga deploy qilinmadi.