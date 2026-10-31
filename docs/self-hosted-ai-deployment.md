# ULUGBEK AI — API kalitisiz serverga o‘rnatish

## Muhim farq

- Chat va ovozli suhbat bir xil `/api/chat` asosiy agentidan foydalanadi. Mikrofon uchun brauzer HTTPS va foydalanuvchi ruxsati kerak; ovoz chiqarish brauzerning Speech Synthesis ovozlariga bog‘liq.
- Til modeli API kalitisiz, server ichida ishlaydigan Ollama orqali ulanadi.
- Dastlabki model: `qwen2.5:3b`. Model birinchi ishga tushishda internetdan yuklanadi va doimiy Docker volume ichida saqlanadi.
- Ochiq internet tadqiqoti hozircha Wikipedia public API bilan cheklangan; API kaliti kerak emas. Qidirilgan matn ishonchsiz manba sifatida ko‘riladi.
- Agentlar chat, tadqiqot, dasturiy ta’minot, frontend, backend, QA, xavfsizlik, DevOps va mahsulot yo‘nalishlarida vazifalarni taqsimlaydi. Kodni ishlab chiqarish serveriga o‘zlari yozmaydi yoki deploy qilmaydi; xavfsiz keyingi bosqich uchun patch/workspace va test ijrochisi alohida qurilishi lozim.

## Tavsiya etiladigan server

- Linux x86_64
- Kamida 8 GB RAM (16 GB qulayroq)
- Kamida 4 vCPU
- 20 GB yoki ko‘proq bo‘sh disk (model va ma’lumotlar uchun)
- Docker Engine va Docker Compose plugin
- Internetga chiqish (modelni birinchi yuklash va ochiq manbalarni o‘qish uchun)

3B model sekin ishlashi mumkin; CPU-only serverda javob kutish vaqti yuqori bo‘ladi. GPU bo‘lsa, Ollama uni qo‘llashi mumkin. Bepul Render rejasi Ollama modelini joylashtirish uchun yetarli deb hisoblanmaydi. `render.yaml` backendni joylaydi, lekin alohida Ollama xizmati yoki doimiy model diski bermaydi.

## O‘rnatish

1. Repozitoriyani serverga oling va loyiha papkasiga kiring.
2. `docker compose up -d --build` buyrug‘ini bajaring.
3. Birinchi marta Ollama `qwen2.5:3b` modelini yuklaydi. Bu internet tezligiga qarab vaqt oladi.
4. Holatni tekshiring:
   - `http://SERVER_IP:3000/api/health`
   - `http://SERVER_IP:3000/api/agents/status`
5. Domen va HTTPS reverse proxy (masalan, Caddy yoki Nginx + sertifikat) sozlang. Mikrofon ko‘p brauzerlarda faqat HTTPS yoki localhostda ishlaydi.
6. `public/config.js` ichidagi API manzilini haqiqiy HTTPS backend manziliga qo‘ying va frontendni qayta joylang.
7. Administrator OAuth va laboratoriya tokenlarini alohida, kuchli qiymatlar bilan sozlang. Sirlarni GitHub kodiga yozmang.

## Ishga tushgandan keyin

`/api/agents/status` quyidagilarni ko‘rsatadi: asosiy chat agenti, agentlar ro‘yxati, mahalliy model bor-yo‘qligi, API kaliti talab qilinmasligi va xavfsizlik chegaralari. Agar `localModel.available=false` bo‘lsa, Ollama konteyneri va model yuklanishini tekshiring:

```sh
docker compose ps
docker compose logs --tail=100 ollama
docker compose logs --tail=100 ollama-model-init
docker compose logs --tail=100 ulugbek-ai
```

## Saqlash va xavfsizlik

- `ulugbek_data` volume bilimlar, xotira va vazifalarni saqlaydi.
- `ollama_models` volume model fayllarini saqlaydi.
- Zaxira nusxa va tiklash rejasi operator zimmasida.
- Ochiq internet matni prompt-injection bo‘lishi mumkin; model uni buyruq emas, ma’lumot sifatida qabul qilishi kerak.
- Tashqi xabar, deploy, pul sarflash, maxfiy ma’lumotga kirish va qaytarib bo‘lmaydigan o‘zgarishlar uchun inson tasdig‘i shart.
- Ushbu compose chat + mahalliy model + cheklangan tadqiqotni ishga tushirish yo‘lini beradi. U o‘z-o‘zidan ishlab chiqarish darajasidagi sandbox kod ijrosi, loyiha fayllarini avtomatik commit qilish, ko‘p serverli navbat, to‘liq ovozli STT/TTS yoki 100% uzluksiz ishlashni ta’minlamaydi.
