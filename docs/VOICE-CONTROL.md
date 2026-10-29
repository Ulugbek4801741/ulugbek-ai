# ULUGBEK AI ovozli boshqaruvi

## Ishlash tartibi
- Foydalanuvchi `Ovoz` tugmasini bosadi va har safar mikrofon yoqilishidan oldin maxfiylik ogohlantirishini ko‘radi.
- Tanilgan oddiy gap matn maydoniga qo‘shiladi; u avtomatik yuborilmaydi. Foydalanuvchi matnni tekshirib, yuborish tugmasini bosadi.
- `yubor` / `jo‘nat` buyrug‘i faqat matn maydonida savol bo‘lsa uni yuboradi.
- `sozlamalarni och` sozlamalarni ochadi.
- `chatni tozala` / `yangi chat` chatni tozalashdan oldin alohida tasdiq so‘raydi.
- `ovozni to‘xtat` ovozli o‘qishni to‘xtatadi. Tugmani qayta bosish tinglashni to‘xtatadi.

## Maxfiylik va cheklovlar
- Ovoz faqat foydalanuvchi tugmani bosib, tasdiqlagandan keyin taniladi; doimiy tinglash yo‘q.
- Ayrim brauzerlarda SpeechRecognition audioni brauzer/OS tashqi xizmatida qayta ishlashi mumkin. Shuning uchun maxfiy ma’lumot aytmaslik haqida ogohlantirish beriladi. Bu funksiya ma’lumotlar uchinchi tomonga umuman chiqmasligini kafolatlamaydi.
- Ovoz tanish brauzerga qarab farq qiladi va internet talab qilishi mumkin. Ovoz tanilmasa, foydalanuvchi matnni qo‘lda yozishi mumkin.
- AI javoblari avtomatik ovozli o‘qilishi alohida sozlama orqali boshqariladi.
- Bu brauzer darajasidagi prototip; to‘liq offline, barcha qurilmalarda ishlaydigan ovoz modeli hali ulanmagan.

## Qo‘lda tekshirish ro‘yxati
1. Tugma telefon va desktopda ko‘rinishi, o‘rtacha kattalikda bo‘lishi va ekranda sig‘ishi.
2. Tugmani bosganda maxfiylik ogohlantirishi chiqishi; bekor qilish mikrofonni yoqmasligi.
3. Ruxsat berilganda tinglash holati ko‘rinishi; qayta bosish tinglashni to‘xtatishi.
4. Oddiy gap matn maydoniga tushishi, ammo avtomatik yuborilmasligi.
5. `yubor` buyrug‘i matn bo‘lmasa hech narsa yubormasligi; matn bo‘lsa formani yuborishi.
6. Chatni tozalashdan oldin tasdiq so‘ralishi.
7. Mikrofon rad etilsa yoki brauzer API qo‘llamasa, tushunarli xabar chiqishi.
8. Ovozli o‘qish tugmasi va ovozni to‘xtatish tugmasi avvalgidek ishlashi.
