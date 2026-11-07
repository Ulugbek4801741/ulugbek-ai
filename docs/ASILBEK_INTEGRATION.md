# ASILBEK AI uchun xavfsiz holat integratsiyasi

`GET /api/integrations/asilbek/status` faqat `ASILBEK_INTEGRATION_TOKEN` Environment o‘zgaruvchisi sozlanganda va `X-Asilbek-Token` to‘g‘ri kelganda ishlaydi.

Endpoint faqat servis holati, versiya/commit, AI provider statusi, navbatdagi vazifalar soni va o‘rganish worker holatini qaytaradi. U hech qanday yozish, boshqaruv, deploy yoki admin-login amalini bajarmaydi.

Render Environment:
- `ASILBEK_INTEGRATION_TOKEN`: ASILBEK AI Render xizmatidagi `ULUGBEK_AI_CONTROL_TOKEN` bilan aynan bir xil kuchli tasodifiy maxfiy token.

Tokenni source control yoki mobil ilovaga joylamang. Mavjud admin cookie va PIN bu integratsiya uchun ishlatilmaydi.
