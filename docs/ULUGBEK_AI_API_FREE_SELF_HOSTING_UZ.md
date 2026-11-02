# ULUGBEK AI — API kalitisiz ishlash va mustaqillik rejasi

## Hozirgi holat
Repo ichidagi `server.js` hozirda `OPENAI_API_KEY` bo'lmasa chat uchun demo javob qaytaradi. `/api/agent/plan` esa oddiy qoidalar bilan reja tuzadi. Diagnostika ham mustaqil fon agentlari va ishlab chiqarish ma'lumotlar bazasi hali sozlanmaganini ko'rsatadi. Demak, bu hali to'liq mustaqil AI platformasi emas.

## API kalitisiz ishlash yo'llari
1. **O'z serveridagi ochiq model:** Ollama yoki vLLM kabi runtime orqali ochiq og'irlikdagi modelni o'z serverimizda ishlatish. vLLM OpenAI-uslubidagi API interfeysini taqdim eta oladi; mijoz kodini mos endpointga yo'naltirish mumkin.
2. **Qurilmada ishlash:** kichik, kvantlangan modelni foydalanuvchi qurilmasida ishga tushirish mumkin, ammo model sifati va tezligi RAM/CPU/GPU ga bog'liq. 4 GB RAMli telefonni katta modelni ishlatadigan server deb hisoblamaslik kerak.
3. **Qoidasimon zaxira rejim:** model ishlamasa oddiy, aniq belgilangan funksiyalar va vazifa rejalari ishlashi mumkin. Buni AI modeli bilan tenglashtirmaslik kerak.
4. **Ko'p model provayderi:** keyinchalik o'z serveridagi model, foydalanuvchi tanlagan tashqi provayder va zaxira model o'rtasida boshqariladigan tanlov qo'shiladi. Tashqi provayderlar majburiy bo'lmasligi kerak.

## Mustaqil API xizmati
ULUGBEK AI o'z API kalitlarini faqat backendda autentifikatsiya, foydalanuvchi/loyiha identifikatsiyasi, kalitlarni xavfsiz xeshlash, bekor qilish, kvota, tezlik cheklovi, foydalanish hisobi va audit jurnali tayyor bo'lgach bera oladi. Kalitni berishning o'zi model yaratmaydi: model inference serveri va uning hisoblash quvvati ham kerak.

## Haqiqiy agentlar uchun minimal arxitektura
- Doimiy saqlanadigan vazifalar navbati va holatlar: queued/running/needs-approval/succeeded/failed.
- Har bir agent uchun roli, ruxsat doirasi, vaqt/so'rov limiti va natija sxemasi.
- Rejalashtiruvchi → vositani bajaruvchi → mustaqil tekshiruvchi → natija va xatolar jurnali.
- Kod bajarish kerak bo'lsa, alohida izolyatsiyalangan sandbox; asosiy serverda tasodifiy kodni bevosita bajarmaslik.
- Internetdan olingan matnni ishonchsiz ma'lumot deb ko'rish; u tizim ko'rsatmalarini almashtira olmaydi.
- Pul sarflash, ma'lumotlarni o'chirish, ommaviy nashr, hisoblar/kalitlar bilan ishlash kabi xavfli amallar uchun inson tasdig'i.
- PostgreSQL kabi ishlab chiqarish bazasi, zaxira nusxalar, monitoring va xatodan tiklash.

## Xavfsizlik
OWASP LLM xavflari qatoriga prompt injection, maxfiy ma'lumotlarning oshkor bo'lishi, xavfli chiqishlarni qayta ishlash va haddan tashqari avtonomiya kiradi. Har bir vosita eng kam ruxsat bilan ishlashi va model chiqishi ishonchsiz deb tekshirilishi kerak.

## Ishlab chiqish tartibi
1. Mavjud API va testlarni mustahkamlash; demo rejimini foydalanuvchiga ochiq ko'rsatish.
2. O'z serveridagi OpenAI-mos model endpointini kalitsiz ulash imkonini qo'shish; maxfiy kalitlarni repoga kiritmaslik.
3. Sinov bilan qoplangan vazifa navbati va cheklangan agent bajaruvchisini yaratish.
4. Ma'lumotlar bazasi, foydalanuvchi hisobi, ruxsatlar, monitoring va zaxira nusxalar.
5. No-code builder, fayl tahlili, internet tadqiqoti va ijtimoiy funksiyalarni birma-bir amalga oshirib, har birini alohida testdan o'tkazish.
6. API mahsulotini faqat autentifikatsiya, kvota, kuzatuv va xavfsizlik sinovlari tayyor bo'lgach chiqarish.

## Chegaralar
Bu hujjat amalga oshirish rejasidir, ishlaydigan funksiya haqida da'vo emas. To'liq mustaqillik, eng kuchli model, nol xarajat yoki 100% xatosiz ishlashni va'da qilib bo'lmaydi. Server, domen, saqlash, hisoblash, xavfsizlik va qonuniy talablar amaliy cheklov bo'lib qoladi.
