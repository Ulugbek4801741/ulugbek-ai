# Ochiq ilmiy manbalar, universitetlar va kutubxonalar

ULUGBEK AI tadqiqot oqimi umumiy veb-qidiruvga qo‘shimcha ravishda federativ ochiq ilmiy API manbalarini tekshiradi.

## Faol API adapterlari

- **Crossref** — DOI va nashr metama’lumotlari; bepul ommaviy API.
- **Europe PMC** — biotibbiyot maqolalari, annotatsiya va ochiq matn mavjudligi.
- **arXiv** — ochiq preprintlar; peer-review qilingan deb avtomatik belgilanmaydi.
- **Zenodo** — maqola, ma’lumotlar to‘plami va dasturiy tadqiqot materiallari.
- **DOAJ** — ochiq kirish jurnallari va maqolalari.
- **ROR** — universitetlar va ilmiy tashkilotlar reyestri, rasmiy sayt havolalari.
- **OpenAlex** — ilmiy ishlar va tashkilotlar grafigi; `OPENALEX_API_KEY` bo‘lsa ulanadi.
- **CORE** — repozitoriylardagi ochiq to‘liq matn; `CORE_API_KEY` bo‘lsa ulanadi.

Har bir provayder xatosi alohida yutiladi: bitta xizmat ishlamasa, qolgan qidiruvlar davom etadi. Takror DOI yozuvlari birlashtiriladi.

## Kutubxonalar va repozitoriylar katalogi

`knowledge-worker/library-sources.json` kitob va ta’lim resurslari katalogini saqlaydi: Open Textbook Library, DOAB, OAPEN, Project Gutenberg, Open Library, LibreTexts, Pressbooks, Wikibooks, Wikiversity va NCBI Bookshelf.

OAI-PMH standart protokoli orqali universitet repozitoriylarini ulash ko‘zda tutilgan. Har bir repozitoriy uchun aniq endpoint alohida ro‘yxatga olinishi va robots.txt, tezlik cheklovi hamda foydalanish shartlari tekshirilishi shart. Bu PR barcha universitetlarning fayllarini ommaviy ko‘chirib olmaydi.

## Huquq va xavfsizlik qoidalari

1. Metadata topilishi maqola to‘liq ochiq degani emas.
2. Faqat API qaytargan ochiq nusxa URL va item-level litsenziya/huquq holati mavjud bo‘lsa, to‘liq matn sifatida ishlatiladi.
3. Publisher sahifalari login, CAPTCHA yoki paywall orqali cheklansa, chetlab o‘tilmaydi.
4. Qidiruv natijasi yoki annotatsiya mustaqil tasdiqlangan fakt deb ko‘rsatilmaydi.
5. Har bir javobda imkon qadar DOI, asl sahifa va manba turi saqlanadi.
6. Ochiq kataloglardan foydalanish model vaznlarini o‘qitish degani emas; bu qidiruv va dalil yig‘ish qatlamidir.

## Render sozlamalari

- `OPENALEX_API_KEY` — ixtiyoriy.
- `CORE_API_KEY` — ixtiyoriy.

Crossref, Europe PMC, arXiv, Zenodo, DOAJ va ROR adapterlari uchun alohida kalit talab qilinmaydi. Render Free resurslari va provayder limitlari sababli barcha so‘rovlarni bir vaqtda cheksiz bajarish kafolatlanmaydi.
