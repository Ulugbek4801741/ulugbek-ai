# ULUGBEK AI — o‘z til modelini noldan yaratish yo‘l xaritasi

## Qat’iy cheklovlar
- GPT, Gemini, Claude, DeepSeek yoki boshqa tashqi model API chaqirilmaydi.
- Tayyor ochiq vaznli model yuklanmaydi va ishlatilmaydi.
- Model vaznlari tasodifiy boshlang‘ich qiymatlardan o‘zimiz o‘qitiladi.
- Faqat foydalanish huquqi aniq bo‘lgan, litsenziyasi qayd etilgan ma’lumotlar ishlatiladi.
- Internetdan olingan kod hech qachon avtomatik ishga tushirilmaydi.
- Model, dataset va trening checkpointlari alohida saqlanadi; maxfiy ma’lumotlar treningga kiritilmaydi.

## Bosqichlar

### 0. Hozirgi poydevor
- Tashqi model API’siz qoidaviy fikrlash va vazifa rejalashtirish.
- Tasdiqlangan bilimlar bazasi va manba qaydlari.
- Agent rollari, vazifa navbati, audit va inson tasdig‘i.
- Bu bosqich neyron til modeli emas.

### 1. O‘quv ma’lumotlarini tayyorlash
- O‘zbek, ingliz va dasturlash matnlaridan litsenziyasi aniq korpus yig‘ish.
- Manba URL, litsenziya, sana, til va hash metama’lumotlarini saqlash.
- Shaxsiy ma’lumot, parol, token, maxfiy kalit va zararli kontentni filtrlash.
- Takroriy matnlarni olib tashlash va train/validation/test to‘plamlariga ajratish.
- Faqat ruxsat etilgan matnlar bilan trening.

### 2. Modelni noldan qurish
- O‘z tokenizerimizni korpusdan o‘qitish.
- Decoder-only Transformer arxitekturasini yozish.
- Vaznlarni tasodifiy boshlash; tayyor model checkpointini import qilmaslik.
- Dastlab kichik tajriba modeli bilan trening pipeline’ini tekshirish.
- Loss, perplexity, token throughput va xatolarni kuzatish.

### 3. Hisoblash infratuzilmasi
- Trening uchun GPU server/klaster kerak; oddiy Node hosting yoki telefon yetarli emas.
- GPU VRAM, disk, RAM, elektr/xizmat narxi va checkpoint saqlash hajmini o‘lchash.
- Treningni qayta davom ettirish uchun checkpoint va dataset versiyalash.
- Ishlab chiqarish serveridagi foydalanuvchi ma’lumotlaridan ajratilgan trening muhiti.

### 4. Baholash
- O‘zbekcha savol-javob, ko‘rsatma bajarish va kod yozish testlari.
- Kod uchun izolyatsiyalangan sandbox, tarmoqsiz test va resurs limitlari.
- Hallutsinatsiya, xavfsizlik, prompt injection va ma’lumot sizishi sinovlari.
- Natijalar yetarli bo‘lmaguncha foydalanuvchilarga model sifatida taqdim etmaslik.

### 5. ULUGBEK AI bilan ulash
- Faqat ichki, o‘zimiz boshqaradigan inference server.
- Agentlar modelga faqat vazifa doirasidagi kontekstni beradi.
- Builder faqat patch taklif qiladi; Verifier alohida sandboxda tekshiradi.
- Security tekshiruvi va administrator tasdig‘isiz merge yoki deploy yo‘q.

## Haqiqat va kutilmalar
Noldan o‘qitilgan kichik model tajriba va tor vazifalarni o‘rganish uchun bo‘ladi. U darhol ChatGPT darajasida bo‘lmaydi. Kuchli kod yozish modeli uchun juda katta, sifatli kod va matn korpusi, GPU hisoblash quvvati, ko‘p bosqichli trening va baholash kerak. Trening xarajati va kerakli GPU miqdori model hajmi, tokenlar soni va kerakli tezlik aniqlangandan keyin hisoblanadi.
