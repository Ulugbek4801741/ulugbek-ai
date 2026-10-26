# ULUGBEK AI — bulutli xotira poydevori

Ushbu modul bir nechta S3-mos xotira xizmatlarini yagona interfeysga birlashtiradi. U xizmatlarni avtomatik ravishda bepul yoki pullik qilmaydi; har bir provayderda hisob ochish, bucket yaratish va maxfiy kalitlarni hosting muhitiga kiritish kerak.

## Hozir qo‘llab-quvvatlanadigan adapterlar

- Cloudflare R2
- Amazon S3 (S3_ENDPOINT ko‘rsatilgan S3 endpoint)
- Backblaze B2 (S3-compatible endpoint)
- Wasabi
- DigitalOcean Spaces
- MinIO (o‘z serveringizda)

Google Cloud Storage va Azure Blob Storage keyingi bosqichda alohida adapterlar bilan ulanadi. Har bir provayderning bepul tarifi, narxi, hududiy mavjudligi va foydalanish shartlari farq qiladi.

## Cloudflare R2 sozlash

1. R2’da bucket yarating.
2. R2 API token/access key yarating; faqat kerakli bucketga ruxsat bering.
3. Hosting muhitiga quyidagilarni kiriting:
   - R2_ENDPOINT: hisobingizga tegishli S3 API endpoint
   - R2_REGION: auto
   - R2_BUCKET: bucket nomi
   - R2_ACCESS_KEY_ID: maxfiy access key ID
   - R2_SECRET_ACCESS_KEY: maxfiy secret key
4. Hech qachon haqiqiy kalitlarni GitHub kodiga, mobil ilovaga yoki brauzer JavaScript’iga joylamang.

## Dasturiy foydalanish

```js
const { createStorageRegistry } = require("./storage/registry");
const storage = createStorageRegistry();
console.log(storage.list());
const r2 = storage.get("cloudflare-r2");
```

Har bir foydalanuvchiga tegishli kalit serverda autentifikatsiya qilingan foydalanuvchi ID’sidan hosil qilinishi kerak. Brauzer/mijoz yuborgan erkin object key’ni tekshirmasdan ishlatmang. Upload/download signed URL’lar vaqtinchalik kirish huquqini beradi; ularni ommaga yoki loglarga yozmang.

## Xavfsizlik chegaralari

- Bu modul hali login, foydalanuvchi kvotasi, billing, virus tekshiruvi, fayl turini magic-byte bilan tekshirish, audit logi yoki client-side end-to-end encryption’ni amalga oshirmaydi.
- Server-side encryption provider sozlamalari va provayderning bucket policy’si bilan alohida tekshirilishi kerak.
- Haqiqiy end-to-end encryption uchun kalitlar foydalanuvchi qurilmasida yaratilishi va serverga berilmasligi kerak.
- Foydalanuvchi ma’lumotlari uchun public bucket yoki ommaviy ACL ishlatmang.
- Prodaksion trafikdan oldin provider testlari, auth/authorization, rate limits, max file size, quota/billing va restore testlari talab qilinadi.
