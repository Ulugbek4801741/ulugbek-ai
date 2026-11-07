# ULUGBEK AI — Function Guardian / Mustaqil boshqaruv yadrosi

## Arxitektura
Har bir HTTP funksiyasi Express middleware orqali kuzatiladi: route, metod, HTTP natijasi va bajarilish vaqti qayd qilinadi. Yozuvlar maxfiy so‘rov tanasi, token yoki foydalanuvchi matnini saqlamaydi. Asosiy self-recovery engine tizim darajasidagi diagnostikani bajaradi; Function Guardian esa funksiya darajasidagi kuzatuvni beradi.

## O‘zini va sherik tizimni tekshirish
- ULUGBEK o‘zining barcha kuzatilgan route-funksiyalarini tekshiradi.
- ASILBEK bilan o‘zaro tekshiruv faqat HTTPS peer-status URL va alohida integratsiya tokeni sozlangandan keyin yoqiladi.
- Har bir tomon sherik javobini mustaqil ravishda timestamp, service identity va health natijasi bilan tekshiradi.
- Peer javobi kelmasa, bu sherik buzilganini anglatmaydi; holat "unreachable/unconfigured" deb qayd qilinadi.

## Tiklash chegaralari
Yadro xatoni aniqlaydi, tarixni saqlaydi va tuzatish taklifini tayyorlash/test qilish jarayonini boshqaradi. U ishlab chiqarish kodini o‘zboshimchalik bilan tahrirlamaydi, shell buyruqlarini ishga tushirmaydi, secrets o‘qimaydi, commit/merge/deploy qilmaydi. Tuzatishlar izolyatsiyalangan branch, CI test, xavfsizlik tekshiruvi va inson tasdig‘idan o‘tadi.

## Cheklov
Kuzatilgan HTTP xatolari barcha ichki funksiyalar to‘liq sog‘lomligini isbotlamaydi. Har bir modul uchun keyinchalik unit/integration test va domain-specific health probe qo‘shilishi shart. 99% tiklash maqsad, kafolat emas; tashqi API, disk, DB, hosting yoki model resursi yo‘q bo‘lsa, yadro ularni o‘zi yaratolmaydi.

## Modul va funksiya darajasidagi qamrov

Server ishga tushganda birinchi tomon modullarining eksport qilingan funksiyalari kuzatuv wrapper'i bilan o‘raladi; Python backendda modulga tegishli public funksiyalar va class metodlari ham o‘raladi. HTTP middleware esa endpoint darajasidagi kuzatuvni qo‘shadi. Har bir hodisa nom, natija va davomiylikni saqlaydi; maxfiy argumentlar, request body va tokenlar yozilmaydi.

Bu qamrov har bir kod satri yoki barcha lokal/private yordamchi funksiyalarni avtomatik kuzatadi degani emas. Har bir modulning ichki tarmoqlari uchun alohida unit/integration testlar va health probe'lar bosqichma-bosqich qo‘shilishi kerak. Wrapper kuzatuv beradi, xatoni avtomatik tuzatmaydi.
