# ULUGBEK AI chat tekshiruvi — 2026-11-19

## Tekshiruv doirasi
Asosiy chat oqimi: browser composer → POST /api/chat → yagona universal agent → AI provider yoki native fallback → javob.

## Topilgan va tuzatilgan nuqsonlar
- Chat oynasida 12 000 belgi limiti ko‘rsatilgan, server esa 4 000 belgida rad etgan. Server limiti 12 000 ga moslashtirildi.
- Fayl tanlash tugmalari faylni faqat tanlab, yubormas edi. Endi .txt, .md, .csv, .json, .xml, .html, .css, .js, .py, .java, .kt, .sql, .yaml, .yml, .log fayllaridan 512 KB gacha bo‘lganlari matn sifatida o‘qilib, chat so‘roviga biriktiriladi.
- Bir xabarga 3 tagacha matnli fayl va jami 7 000 belgigacha fayl matni qo‘shiladi; butun xabar 12 000 belgidan oshmasligi kerak.
- Rasm/video tanlash hozircha AI tahlili emas. UI bu cheklovni ochiq bildiradi; yolg‘on “yuborildi” xabari olib tashlandi.

## Hali bajarilmagan / tekshirilmagan
- Rasmni ko‘rish va video/audio fayllarni tahlil qilish uchun multimodal model adapteri va xavfsiz fayl saqlash kerak.
- Chat tarixi brauzer sessiyasi tugagandan keyin tiklanishi va serverlar orasida sinxronlanishi alohida persistent storage talab qiladi.
- Haqiqiy model javobi AI provider sozlamalariga bog‘liq. Provider sozlanmaganida native fallback ishlaydi; bu ChatGPT darajasidagi model emas.
- Ovozdan matnga va matndan ovozga aylantirish brauzer/Android qurilmasining Speech API va TTS xizmatiga bog‘liq; real-time ikki tomonlama ovozli suhbat hali yo‘q.
- GitHub’dagi kod ko‘rigi jonli qurilmada barcha ssenariylar o‘tganini isbotlamaydi.

## Qabul mezonlari
- npm test to‘liq o‘tishi.
- POST /api/chat 12 000 belgigacha xabarni qabul qilishi va 12 001 belgida 413 qaytarishi.
- Matnli fayl tarkibi model so‘roviga kirishi.
- Noto‘g‘ri format, 512 KB dan katta fayl va rasm/video tahlili qo‘llanmasligi ochiq ko‘rsatilishi.
- Render deploy live bo‘lishi va jonli chat sinovlari javob qaytarishi.

## Xulosa
Bu bosqich chat interfeysidagi aniq ikki nuqsonni tuzatadi. “100% tayyor” deb belgilash uchun yuqoridagi qolgan mezonlar, ayniqsa haqiqiy model, xotira, multimodal va real-time ovoz sinovlari bajarilishi shart.