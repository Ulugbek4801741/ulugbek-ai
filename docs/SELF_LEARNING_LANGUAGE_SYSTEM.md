# ULUGBEK AI — mustaqil til moduli va bilimlar oqimi

## Hozirgi integratsiya

1. `lab-learning-worker.js` faqat ommaviy ochiq manbalardan ma'lumot yig'adi. Sahifalar avval `pending-review` holatida saqlanadi.
2. Administrator tasdiqlagan (`approved`) bilimlar `knowledge.json` ichida saqlanadi.
3. `modules/language-learning-worker.js` shu tasdiqlangan yozuvlardan davriy ravishda til korpusini tuzadi.
4. `modules/language-cognition.js` tokenizatsiya, so'z chastotalari, bigram/trigram statistikasi, keyingi so'z taxmini va dalil reytingini o'rganadi. Model atomik JSON yozuvi bilan saqlanadi.
5. Chat faqat `lab-learning-worker.searchKnowledge()` orqali qaytarilgan tasdiqlangan bilimlardan foydalanadi. Tashqi AI sozlangan bo'lsa, shu dalillar model kontekstiga qo'shiladi; aks holda mahalliy fallback ishlaydi.
6. O'qitish natijasi `/api/language/status`, `/api/cognition/status`, `/api/ai/status` va `/api/health` orqali ko'rinadi.

## Cheklovlarni to'g'ri tushunish

- Hozirgi mustaqil til modeli — lokal so'z n-gram statistik modeli. Bu neyron LLM emas va uning vaznlari GPT darajasida qayta o'qitilmaydi.
- `training/train_tiny_gpt.py` — alohida tajriba; u hozir production chat modeliga ulanmagan.
- Haqiqiy neyron modelni noldan o'qitish uchun katta sifatli korpus, GPU/accelerator, disk, baholash va model-serving kerak. Render Free bunday trening uchun mo'ljallanmagan.
- Tashqi Gemini/Anthropic yoki OpenAI-compatible model faqat to'g'ri maxfiy kalit, model nomi va endpoint sozlanganda ishlaydi.
- `local-json` ma'lumotlar doimiy saqlanishi uchun Render persistent diskini `ULUGBEK_DATA_DIR` yo'liga ulang. Disk bo'lmasa deploy/restart paytida ma'lumot yo'qolishi mumkin.
- Bir nechta server nusxasini yoqmang: JSON fayl ombori hozir multi-instance-safe emas.

## Render sozlamalari

Minimal:
- `ULUGBEK_DATA_DIR=/var/data` (persistent disk mount path bilan bir xil bo'lishi kerak).
- Persistent disk mount path: `/var/data`.
- Hosted model kerak bo'lsa: `GEMINI_API_KEY` va `GEMINI_MODEL`, yoki `ANTHROPIC_API_KEY` va `ANTHROPIC_MODEL`.
- Kalitlarni GitHub'ga, chatga yoki kodga yozmang; faqat Render Environment secrets sifatida kiriting.

## Ishga tushgandan keyingi tekshiruv

- `GET /api/health`: server, provider va mustaqil til modeli holati.
- `GET /api/language/status`: til modeli korpusi, tillar, tokenlar va o'qitish ishchisi.
- `GET /api/lab/learning/status`: ochiq manba yig'ish ishchisi.
- Chat sinovi: avval bilimni admin panelda tasdiqlang, keyin shu mavzuda savol bering va `knowledgeUsed` qiymatini tekshiring.

## Xavfsizlik qoidalari

- Robots.txt, sayt tezligi va bloklash qoidalariga amal qiling; 403/429 yoki taqiqni chetlab o'tmang.
- Yuklangan kod hech qachon avtomatik bajarilmaydi.
- Yangi o'zgarishlar avval test va alohida branch/PR orqali tekshiriladi.
- Model o'zi o'rgangan matnni fakt sifatida avtomatik tasdiqlamaydi; bilimlar admin tekshiruvidan o'tadi.
