# ULUGBEK AI — Universal agent tizimi

## Maqsad
Telefon, kompyuter, internet, ilmiy hisoblash, muhandislik va biznes ishlarini yagona boshqaruvchi orqali birlashtirish. Bu hujjat arxitektura va talablarni belgilaydi; u barcha agentlar allaqachon ishlayotganini anglatmaydi.

## Agentlar
1. Universal Coordinator — vazifani kichik ishlarga ajratadi, mos agentlarni tanlaydi va natijalarni birlashtiradi.
2. Phone Agent — faqat foydalanuvchi bergan Android ruxsatlari doirasida ishlaydi.
3. Computer Agent — ruxsat etilgan kompyuter ilovalari, brauzer va fayllar bilan ishlaydi.
4. Internet Research Agent — manbalarni qidiradi, solishtiradi va dalillar tayyorlaydi.
5. Quantum & Scientific Computing Agent — kvant algoritmlari, matematik modellar va simulyatsiyalarni mavjud vositalar bilan bajaradi. Haqiqiy kvant kompyuterga ulanish faqat xizmat sozlanganda mavjud bo‘ladi.
6. Engineering Agent — muhandislik tahlili va loyiha takliflarini tayyorlaydi; xavfsizlikka ta’sir qiladigan yakuniy loyihani malakali mutaxassis tekshiradi.
7. Company Operations Agent — biznes jarayonlari, hujjatlar va hisobotlarda yordam beradi; moliyaviy yoki huquqiy harakatlar alohida tasdiqlanadi.
8. Fallback Agent — boshqa agent bajara olmagan vazifani tahlil qiladi, muqobil usul taklif qiladi yoki inson yordamiga yuboradi.
9. Independent Safety Reviewer — dalil, ruxsat, xavf va natijani alohida tekshiradi.
10. Human Approval Gate — xavfli yoki tashqi ta’sirli amallar uchun insonning aniq roziligini talab qiladi.
11. Medical Safety Agent — tibbiy dalillarni tartiblaydi va klinik mutaxassisga yordam beradi; jarrohlikni mustaqil boshqarmaydi.

## Uch bosqichli tekshiruv
1. Statik va xavfsizlik tekshiruvi: kod/dependency, maxfiy kalitlar, ruxsatlar, zararli kirish va ma’lumot chegaralari.
2. Sinov muhiti: avtomatik testlar, xato holatlari va cheklangan vositalar; real foydalanuvchi ma’lumoti yoki real pul ishlatilmaydi.
3. Mustaqil tekshiruv va inson tasdig‘i: dalillar ko‘rib chiqiladi, inson ruxsat beradi, keyin cheklangan bosqichli chiqarish va kuzatuv amalga oshiriladi.
Tekshiruv muvaffaqiyatsiz bo‘lsa modul ishga tushirilmaydi; xato sababi yozilib, insonga qaytariladi.

## Inson tasdig‘i talab qilinadigan amallar
- Xabar yoki ommaviy post yuborish.
- Fayllarni o‘chirish yoki tashqi joyga uzatish.
- Pul sarflash, xarid, savdo yoki to‘lov.
- Kodni ishlab turgan serverga joylash.
- Yangi ruxsat yoki hisob ulanishini berish.
- Tibbiy, huquqiy, xavfsizlikka oid yoki hayot uchun muhim qarorlar.
Agentlar API kalitlarini frontendga joylamasligi, ruxsatlarni chetlab o‘tmasligi va roziliksiz kuzatuv o‘rnatmasligi kerak.

## 90% avtomatlashtirish maqsadi
90% hozirgi imkoniyat yoki kafolat emas; kelajakda vazifa toifalari bo‘yicha o‘lchanadigan maqsad. Har bir toifada muvaffaqiyat, xato, vaqt, xarajat va inson aralashuvi o‘lchanadi. Xavfli vazifalar umumiy foizga qo‘shib yuborilmaydi.

## Kvant hisoblash
Algoritmni tushuntirish yoki simulyatsiya qilish haqiqiy kvant kompyuter hisoblashini anglatmaydi. Haqiqiy hisoblash uchun provayder, hisob, ruxsat, xarajat limiti va natijani tekshirish zarur.

## Hozirgi holat
- Agentlar katalogi modules/catalog.js ichida metadata sifatida mavjud.
- prototype mavjud dasturdagi qisman imkoniyatni, planned esa hali qurilmagan integratsiyani anglatadi.
- Telefon/kompyuter boshqaruvi, haqiqiy kvant hisoblash, barcha sohalarda mustaqil muhandislik va tibbiy amallar bajarilishi hali tasdiqlangan funksiyalar emas.
- Har bir integratsiya alohida kod, test, ruxsat va xavfsizlik tekshiruvini talab qiladi.