# ULUGBEK AI — xavfsiz mustaqil takomillashtirish

## Nima qiladi

Server ishga tushganda va har 30 daqiqada planner mavjud tizim holati va modul katalogini o‘qiydi. Aniqlangan bo‘shliqlarni takliflar ro‘yxatiga yozadi. Har besh daqiqalik ovozli hisobot kutayotgan takliflar sonini ham aytadi.

Aniqlanadigan yo‘nalishlar:
- PostgreSQL/ishlab chiqarish ma’lumotlar bazasi va ko‘p nusxali saqlash;
- zaxira server, monitoring va failover;
- mahalliy til modeli;
- mutaxassis agentlar muvofiqlashtiruvi;
- xavfsizlik qoidalarining haqiqiy bajarilishi;
- katalogda prototype yoki planned deb belgilangan modullar.

## Admin API

Barcha yo‘llar administrator sessiyasi bilan himoyalangan. Administrator panelidagi “ULUGBEK AI — o‘z kamchiliklarini aniqlash” bo‘limi shu API bilan ishlaydi. Barcha yo‘llar:
- GET /api/admin/improvements — holat va takliflar.
- POST /api/admin/improvements/scan — hozir darhol qayta tekshirish.
- POST /api/admin/improvements/:id/decision — JSON {"decision":"approve"} yoki {"decision":"reject"}.

Tasdiq faqat taklifni approved_for_implementation holatiga o‘tkazadi. Bu kodni o‘zgartirmaydi va buyruqni bajarmaydi.

## Xavfsizlik chegarasi

Ushbu versiya ataylab faqat read-only diagnostika va rejalashtirish qiladi:
- Shell, npm, Python yoki Git buyruqlarini o‘zi bajarmaydi.
- O‘z manba kodini o‘zgartirmaydi.
- Tashqi saytga yozmaydi, fayl yuklamaydi va xabar yubormaydi.
- Admin tasdig‘ini production deploy ruxsati deb qabul qilmaydi.
- Xavfsizlik siyosati, credential va ruxsatlarni o‘zi kengaytirmaydi.

Haqiqiy avtomatik kod yozish keyingi bosqichda alohida izolyatsiyalangan build runner, vaqtinchalik branch, test sandbox, mustaqil security review, artifact imzosi va alohida deploy tasdig‘i bilan qurilishi kerak. Bularsiz o‘z kodini avtomatik o‘zgartirish production serverni buzishi yoki ma’lumotni oshkor qilishi mumkin.

## Saqlash va hosting

Takliflar ULUGBEK_DATA_DIR/improvement-proposals.json faylida saqlanadi. Render disk doimiy ulangan bo‘lishi kerak. Bir nechta server nusxasi uchun bu JSON fayl umumiy koordinatsiya bazasi emas; PostgreSQL migratsiyasi hali alohida ish.

## Tekshiruv

node --test quyidagilarni tekshiradi: bo‘shliqlarni topish, takliflarni takrorlamaslik, saqlash/qayta yuklash, admin qaror holati va kod/deploy avtomatik bajarilmasligi. Bu production Render, haqiqiy AI model, Android fon xizmati yoki ko‘p foydalanuvchi yuklamasining end-to-end sinovi emas.