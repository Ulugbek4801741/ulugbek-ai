# ULUGBEK AI — mustaqil model arxitekturasi

## Qat'iy talab
- OpenAI API kaliti yoki OpenAI hosted endpoint ishlatilmaydi.
- Gemini, Anthropic yoki boshqa pullik hosted modelga avtomatik fallback yo'q.
- Model javob bermasa, tizim native reasoning/knowledge rejimini ochiq bildiradi; o'zini katta neyron model deb ko'rsatmaydi.

## Ishlash zanjiri
1. Chat API foydalanuvchi savolini qabul qiladi.
2. Universal agent maqsad, xavf va kerakli mutaxassis rollarini belgilaydi.
3. Research moduli ochiq internetdan natijalarni qidiradi, sahifalarni o'qiydi va manba URLlarini qaytaradi.
4. Tasdiqlangan bilim ombori tegishli kontekstni beradi.
5. Mahalliy model runtime (Ollama yoki mahalliy OpenAI-compatible server) javob matnini yaratadi.
6. Verifier javobni manbalar, mantiq va topshiriq mezonlari bo'yicha tekshiradi.
7. Agent tashqi tizimga yozish/deploy/pul sarflash kabi harakatlarni alohida ruxsatsiz bajarmaydi.

## Mahalliy model sozlamalari
Ollama uchun:
- ULUGBEK_OLLAMA_URL=http://<model-host>:11434
- ULUGBEK_OLLAMA_MODEL=<o'rnatilgan-model-nomi>
- ULUGBEK_AI_PROVIDER=ollama (ixtiyoriy; avtomatik aniqlash ham mavjud)

API kaliti talab qilinmaydi. Model serveri internetga ochiq holda himoyasiz qoldirilmasin; TLS, autentifikatsiya yoki private network ishlatilsin.

## Haqiqiy cheklov
Render Free web service GPU inference uchun mos emas va model og'irliklarini avtomatik yaratmaydi. Xiaomi/Android telefonidagi 4 GB RAM bilan katta modelni server darajasida ishlatish real emas. Katta model uchun GPU host yoki kuchli kompyuter kerak; CPU-only kichik model esa sekin bo'lishi mumkin. Shuning uchun koddagi providerni o'chirish mustaqil katta til modelini o'z-o'zidan yaratmaydi — model fayllari va hisoblash resursi alohida kerak.

## Holatni tekshirish
- `GET /api/ai/status`
- `GET /api/independent/status`
- `GET /api/research/status`
- `GET /api/capabilities`

Status endpointlar konfiguratsiyani bildiradi; ular modelning sifatini yoki end-to-end chatni o'z-o'zidan tasdiqlamaydi.
