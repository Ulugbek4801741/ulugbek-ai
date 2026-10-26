# ULUGBEK AI — global storage provider foundation

Bu katalog turli bulut xotiralarni yagona loyiha ichida rejalashtirish uchun. U provayder hisobini ochmaydi, hisoblarni bir-biriga qo‘shmaydi va bepul/pullik limitlarni avtomatik birlashtirmaydi. Har bir xizmat alohida hisob, shartlar, xavfsizlik sozlamalari va ko‘pincha alohida to‘lov talab qiladi.

## Holatni to‘g‘ri tushunish

- **Adapter mavjud**: umumiy S3 API adapteri kodda mavjud; endpoint, bucket va maxfiy kalitlar hostingda sozlanib, haqiqiy bucket bilan sinovdan o‘tmaguncha xizmat tayyor deb hisoblanmaydi.
- **Adapter kerak**: maxsus SDK/API bilan alohida dasturlash kerak.
- **OAuth integratsiyasi kerak**: foydalanuvchi o‘z Drive/OneDrive/Dropbox hisobiga rozilik bilan ulanadi; ularning xotirasi ULUGBEK AI egaligidagi xotira emas.
- **Haqiqiy ajratilgan sig‘im hozir: 0 GB / 0 TB**. Bu kod katalogi, provayder hisoblari yoki pullik tariflarni yaratmaydi.

## S3-mos adapteri uchun ro‘yxat

Cloudflare R2, Amazon S3, Backblaze B2, Wasabi, DigitalOcean Spaces, MinIO, Tigris, Hetzner Object Storage, Vultr Object Storage, Akamai Object Storage, Scaleway Object Storage, Storj, IDrive e2 va Oracle S3-compatible endpointlari katalogda bor. Har bir xizmatning S3 mosligi va endpoint sozlamasi hisob/regionga qarab farq qilishi mumkin; haqiqiy fayl yuklash-o‘chirish-qayta o‘qish testi shart.

Har bir provayder uchun quyidagi muhit o‘zgaruvchilari ishlatiladi: `PREFIX_ENDPOINT`, `PREFIX_BUCKET`, `PREFIX_ACCESS_KEY_ID`, `PREFIX_SECRET_ACCESS_KEY`; region kerak bo‘lsa `PREFIX_REGION`. Masalan, R2 uchun `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_REGION=auto`. Haqiqiy kalitlarni chatga, GitHub kodiga, mobil ilovaga yoki brauzerga joylamang.

## Alohida adapter talab qiladiganlar

- Google Cloud Storage, Azure Blob Storage, Firebase Storage, Supabase Storage va Cloudinary: maxsus SDK/API, auth, kvota va testlar kerak.
- Google Drive, Microsoft OneDrive, Dropbox: OAuth roziligi va foydalanuvchining o‘z hisobiga cheklangan kirish kerak. Bularni foydalanuvchi roziligisiz umumiy xotira sifatida ishlatib bo‘lmaydi.

## Keyingi amalga oshirish bosqichlari

1. Hisob/bucket ochish va maxfiy kalitlarni hosting Secrets/Environment Variables’ga kiritish.
2. Har bir provayderda test faylini yuklash, metama’lumotni olish, qayta yuklab tekshirish va o‘chirish.
3. ULUGBEK AI login/session bilan serverdagi API route’larini himoyalash.
4. Foydalanuvchi kvotasi, fayl hajmi/turi tekshiruvi, audit, rate-limit, billing va sarf ogohlantirishlari.
5. Google/Azure/Firebase/Supabase/Drive kabi maxsus adapterlar.
6. Zaxira nusxa va qayta tiklash mashqi; bir xil faylni bir necha joyga ko‘paytirishdan oldin xarajat va maxfiylikni hisoblash.

## Xavfsizlik

Bu katalog hali login, per-user authorization, kvota, billing, virus tekshiruvi, client-side end-to-end encryption yoki backup/restore’ni ta’minlamaydi. Signed URL vaqtinchalik kirish beradi, ammo E2EE emas. Prodaksion foydalanuvchi fayllarini saqlashdan oldin xavfsizlik va provider-specific testlar talab qilinadi.
