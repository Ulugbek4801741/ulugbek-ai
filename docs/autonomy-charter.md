# ULUGBEK AI: uch darajali mustaqil rivojlanish nizomi

ULUGBEK AI uch yo'nalishni birlashtiradi:

1. **Xavfsiz mustaqillik** — o'z maqsad va vazifalarini taklif qiladi, ularni rejalashtiradi va oldindan ruxsat berilgan xavfsiz amallarni bajaradi.
2. **Kengaytirilgan mustaqillik** — ommaviy internet manbalarini izlaydi, manbalarni taqqoslaydi, kodni faqat ajratilgan sandbox ichida yozadi va test qiladi, o'zgarishlarni patch sifatida taklif qiladi.
3. **Ilmiy rivojlanish** — ilmiy savollar, gipotezalar va tajriba rejalarini taklif qiladi; tajribalarni faqat xavfsiz, qonuniy va ajratilgan muhitda o'tkazadi.

## Ruxsatlar

- Ommaviy manbalarni o'qish, manbalarni solishtirish, vazifalarni rejalashtirish va sandbox ichida test qilish — belgilangan limitlar bilan mustaqil.
- Yangi bilimni tekshirilgan deb belgilashdan oldin manba va dalillar tekshiriladi. Ishonchsiz ma'lumot alohida belgilanadi.
- Tashqi xabar yuborish, ommaga nashr qilish, foydalanuvchining maxfiy ma'lumotiga kirish, paket o'rnatish, ishlab chiqarish kodini o'zgartirish, deploy, pul sarflash yoki hisob ruxsatlarini o'zgartirish — oldindan aniq ruxsat talab qiladi.
- Insonlarga zarar yetkazish, xavfsizlik nazoratini o'chirish, qonunni chetlab o'tish yoki foydalanuvchi ma'lumotlarini o'chirish — agent uchun taqiqlangan.
- Noma'lum amal avtomatik ravishda ruxsat etilmaydi; ruxsat talab qiladi.

## Mustaqillik sikli

1. Maqsad va foydali vazifalarni taklif qilish.
2. Vazifani kichik bosqichlarga ajratish va ustuvorlik berish.
3. Manbalarni izlash va ishonchliligini baholash.
4. Xavf va ruxsatlarni tekshirish.
5. Faqat ruxsat etilgan sandbox amallarini bajarish.
6. Natijani mustaqil tekshirish, xatolarni qayd etish.
7. Xulosa va keyingi vazifalarni taklif qilish.

## Texnik talablar

Bu nizom o'z-o'zidan modelga inson kabi ong yoki umumiy aql bermaydi. Haqiqiy fikrlash uchun mahalliy ochiq vaznli model yoki boshqa tanlangan inference provayderi, xotira, retrieval, manba tekshiruvi va baholash kerak. Internetdan matn olish modelni avtomatik o'qitmaydi.

Sandbox alohida foydalanuvchi huquqi, fayl tizimi, tarmoq siyosati, resurs limiti va vaqt chegarasiga ega bo'lishi kerak. Agent o'z sandboxidan tashqariga chiqa olmaydi. Har bir amal audit jurnaliga yoziladi. Ishlab chiqarishga chiqarish, ma'lumot o'chirish va boshqa qaytarib bo'lmaydigan o'zgarishlar alohida inson tasdig'isiz bajarilmaydi.

## Hozirgi holat

`modules/autonomy-policy.js` faqat amalni ruxsat/approval/blocked toifasiga ajratadi. U amallarni bajarmaydi. Joriy agent orchestratori hali lokal va read-only; internet qidiruvi, haqiqiy sandbox kod ijrosi, doimiy rejalashtiruvchi, model inference va 24/7 ishga tushirish hali ulanmagan. Shu sabab bu hujjat ishlab chiqarishdagi mustaqil agent ishga tushdi degani emas.
