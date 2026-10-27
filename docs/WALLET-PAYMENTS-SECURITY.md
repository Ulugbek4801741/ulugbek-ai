# ULUGBEK AI — hamyon va to‘lovlar: xavfsiz integratsiya rejasi

## Hozirgi holat
`public/wallet.html` — demo interfeys. U karta yoki kripto hamyonini ulamaydi, pul qabul qilmaydi, balansni o‘zgartirmaydi va demo so‘rovlarni serverda saqlamaydi. Real moliyaviy amallar yoqilmagan.

## Ishlab chiqarish uchun kerak bo‘ladigan qatlamlar
1. **Hisob va ledger:** foydalanuvchi autentifikatsiyasi, PostgreSQL kabi tranzaksion DB, ikkiyoqlama yozuv (double-entry ledger), idempotency key, audit log va reconciliation.
2. **Karta/fiat:** mamlakat va biznes modeli uchun ruxsatli PSP/acquirer. Hosted checkout/tokenization ishlatilsin; PAN/CVV/PIN ULUGBEK AI tizimiga kirmasin. Webhook imzosi, replay himoyasi, qaytarishlar va chargeback jarayoni.
3. **Visa/Mastercard va mahalliy kartalar:** kartaning o‘zi tarmoq emas; qo‘llab-quvvatlash bank/PSP va mamlakatga bog‘liq. Provayder shartnomasi va merchant onboarding talab qilinadi.
4. **Kripto:** boshlanishida self-custody hamyonni faqat wallet-connect yoki provayderning xavfsiz oqimi orqali ulash; seed phrase yig‘ilmasin. Custody, konversiya yoki foydalanuvchi mablag‘ini saqlashdan oldin litsenziya, AML/KYC, sanksiya tekshiruvi, soliq va yurisdiksiya masalalari yuridik ko‘rib chiqiladi.
5. **Pul tushumlari:** provayder imzolagan webhook → server-side verification → idempotent ledger yozuvi → reconciliation. Frontenddagi “muvaffaqiyatli” xabar balansga dalil bo‘la olmaydi.
6. **Dasturchi/agent to‘lovlari:** so‘rovda xizmat, rasmiy oluvchi, hisob/faktura, summa, valyuta, muddat, komissiya va sabab bo‘lsin. Foydalanuvchi aniq tranzaksiyani tasdiqlaydi; ruxsat oluvchi, summa va amal muddati bilan chegaralanadi. Yangi oluvchi yoki limitdan yuqori to‘lov uchun qayta autentifikatsiya talab etiladi.
7. **Davlat xizmatlari:** faqat rasmiy API yoki ruxsatli to‘lov agregatori. Davlat portali login/parolini yig‘ish yoki CAPTCHA/MFA cheklovini chetlab o‘tish mumkin emas.
8. **Bekor qilish va monitoring:** pending to‘lovni bekor qilish, kalitlarni aylantirish, fraud monitoring, adminning favqulodda freeze tugmasi, foydalanuvchi bildirishnomasi va audit trail.
9. **Sinov:** sandbox, webhook soxtalashtirish, duplicate callbacks, refund, timeout, currency rounding, role/permission, pen-test va yuridik/compliance tekshiruvi.

## Tavsiya etilgan bosqichlar
- 1-bosqich: demo UI va moliyaviy siyosat.
- 2-bosqich: tanlangan PSP sandbox + foydalanuvchi hisobi va ledger.
- 3-bosqich: provayder tasdig‘i, audit va refund testlari.
- 4-bosqich: tegishli ruxsatlar va yuridik tekshiruvdan keyin kichik pilot.
- 5-bosqich: kripto yoki davlat to‘lovlari faqat tegishli provayder/rasmiy integratsiya tayyor bo‘lganda.

**Muhim:** foydalanuvchi mablag‘larini saqlash, o‘tkazish, kripto custody yoki to‘lov xizmatlarini ko‘rsatish uchun oddiy web sahifa yetarli emas. Provayder va qonuniy talablar aniqlanmaguncha real to‘lov funksiyalarini yoqmang.
