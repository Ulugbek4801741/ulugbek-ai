# Yagona Universal Core — umumiy arxitektura

Ushbu hujjat ULUGBEK AI va ASILBEK AI uchun bir xil funksional shartnoma va interfeysni belgilaydi. Kod, ma'lumotlar, model fayllari, kalitlar, serverlar va foydalanuvchi xotirasi ikki repoda alohida qoladi. Bu hujjat loyihalarni bir-biriga ulashga ruxsat bermaydi.

## 1. Maqsad
Millionlab mustaqil dasturlarni alohida boshqarish o'rniga, bitta Universal Core foydalanuvchi topshirig'ini tushunadi, rejalashtiradi va ichki modullar orasida yo'naltiradi. Har bir modul tor vazifani bajaradi; foydalanuvchi esa bitta chat va yagona boshqaruv oynasidan foydalanadi.

Bu bitta ulkan dastur degani emas: ichki modullar aniq interfeys, ruxsat, vaqt chegarasi, xatolik qayta ishlash va test bilan boshqariladi.

## 2. Asosiy qatlamlar
1. Conversation Core — Uzbek-first chat, kontekst, dialog holati, ko'p tilli kirish/chiqish.
2. Planner — vazifani kichik qadamlarga ajratish, bog'liqliklar, muddat va resurs limitlari.
3. Capability Registry — ichki funksiyalar ro'yxati, versiyasi, input/output sxemasi, sog'liq holati va ruxsatlari.
4. Tool Runtime — modullarni izolyatsiyada ishga tushirish; timeout, retry, idempotency va audit.
5. Knowledge Engine — PDF/EPUB, matn, rasm OCR (alohida OCR worker kerak), manba kelib chiqishi, BGE-M3 embedding va vektor qidiruv.
6. Model Runtime — mahalliy embedding va chat/kod modellari uchun alohida servis interfeysi. Model mavjud bo'lmasa, tizim bu cheklovni ochiq bildiradi.
7. Memory — foydalanuvchi xotirasi, vazifa xotirasi va tasdiqlangan bilimni alohida saqlash.
8. Engineering Lab — kodni o'qish, patch taklif qilish, sandbox test, xavfsizlik tekshiruvi, Draft PR va rollback.
9. Media Studio — hujjat, jadval, taqdimot, rasm va video pipeline. Har bir format uchun haqiqiy renderer/encoder worker talab qilinadi.
10. Service/API Gateway — ichki API, autentifikatsiya, rate-limit, health va metrikalar.
11. UI Shell — yagona chat, ovoz, fayl yuklash, vazifalar paneli, bilim kutubxonasi va egasi uchun admin panel.
12. Operations — backup, restore, monitoring, queue, disk/GPU/RAM nazorati va disaster recovery.

## 3. Capability interfeysi
Har bir ichki vosita quyidagi shartnomaga mos bo'lishi kerak:
- id, version, description;
- input_schema, output_schema;
- required_permissions;
- resource_limits (CPU, RAM, GPU, disk, vaqt);
- health_check;
- execute(input, context);
- standart xatolik kodi va kuzatuv identifikatori.

Planner faqat ro'yxatdan o'tgan, sog'lom va foydalanuvchi ruxsat bergan capability'ni chaqiradi. Noma'lum kodni avtomatik ishga tushirmaydi.

## 4. Tashqi servisga qaramlikni kamaytirish
- Asosiy chat va qidiruv uchun o'z serverimizdagi model/runtime birinchi tanlov.
- BGE-M3 faqat embedding/qidiruv; u chat LLM o'rnini bosmaydi.
- Qdrant — vektor indeks; asl kitoblar va tasdiqlangan matn alohida doimiy diskda.
- Tarmoq uzilganda: lokal model, lokal indeks, lokal hujjatlar va navbatdagi ishlar davom etadi; internet talab qiladigan vazifalar waiting_for_network holatiga o'tadi.
- Tashqi API adapterlari ixtiyoriy bo'ladi; ular o'chirilganda core ishga tushishi kerak.
- OS, drayver, apparat, domen nomi yoki elektr energiyasidan mutlaq mustaqillik va'da qilinmaydi.

## 5. Bir xil foydalanuvchi interfeysi
Bosh ekran:
- chap panel: yangi chat, tarix, loyihalar, bilim kutubxonasi;
- markaz: chat va fayl biriktirish;
- composer: matn, mikrofon, fayl, vazifa rejimi;
- o'ng/ikkinchi tab: vazifalar, bajarilish bosqichlari va natijalar;
- admin: model holati, disk/RAM/GPU, worker, navbat, backup va audit.

UI funksiyani bajargan deb ko'rsatmaydi; faqat backend natijasi va tekshiruvdan o'tgan holatni ko'rsatadi. Mobil ekranda panel drawer/tab ko'rinishiga moslashadi.

## 6. Ruxsat va xavfsizlik
- Oddiy o'qish/qidiruv: foydalanuvchi ruxsati doirasida avtomatik.
- Yangi faylni sandbox ichida yaratish va test: cheklangan muhitda avtomatik.
- Repo'ga o'zgarish: alohida branch va Draft PR; kod review qilinadi.
- main ga merge, production deploy, pul sarflash, maxfiy kalitlar, foydalanuvchi ma'lumotini o'chirish, permission yoki xavfsizlik siyosatini o'zgartirish: egasining aniq tasdig'i shart.
- Hech qachon qurol, zararli kod, ruxsatsiz kuzatuv yoki inson hayotiga xavf tug'diruvchi real dunyo boshqaruvini avtomatlashtirmaslik.

## 7. Ishga tushirish va sifat darajalari
Har bir capability uchun quyidagi statuslardan biri qayd qilinadi:
- planned — faqat reja;
- implemented — kod yozilgan;
- unit-tested — lokal/unit test o'tgan;
- integration-tested — bog'langan servislar bilan test o'tgan;
- production-verified — haqiqiy production muhitida tekshirilgan.

Release darvozasi:
1. statik tekshiruv va dependency audit;
2. unit va integration test;
3. container build;
4. sandbox end-to-end test;
5. backup/restore va rollback mashqi;
6. egasi tasdig'i;
7. deploy va production smoke test.

CI muvaffaqiyati production ishga tushganini anglatmaydi.

## 8. Mustaqil ma'lumot chegaralari
ULUGBEK AI va ASILBEK AI quyidagilarni hech qachon umumiy ishlatmaydi:
- database va vector collection;
- kitob arxivi va foydalanuvchi fayllari;
- embedding/model cache va LoRA adapterlari;
- API kalitlari, owner tokenlari va session;
- server disk/backup va monitoring identifikatorlari.

Faqat funksional arxitektura va UI shartnomasi bir xil bo'ladi. Har bir repo o'zining nusxasini alohida build qiladi.

## 9. Amalga oshirish bosqichlari
1. Mavjud kod va endpoint inventarizatsiyasi; zid yoki takroriy qismlarni aniqlash.
2. Capability Registry va Universal Core API'ni qo'shish.
3. Chat/UI shell'ni mavjud frontend bilan moslashtirish.
4. Knowledge Engine: PDF/EPUB -> extraction -> chunking -> BGE-M3 -> vector search -> citation.
5. Mahalliy chat model runtime va o'zbekcha baholash to'plami.
6. Media workerlar: hujjat, jadval, taqdimot, rasm, video.
7. Self-Engineering sandbox, test va Draft PR.
8. Monitoring, persistent storage, backup/restore va production tekshiruvlari.

Har bosqich mustaqil testlanadi. Hali bajarilmagan bosqichlar tayyor deb belgilanmaydi.
