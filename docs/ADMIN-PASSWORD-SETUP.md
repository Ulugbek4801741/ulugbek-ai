# ULUGBEK AI — admin paroli sozlamasi

## Server sozlamalari

1. Hostingda `ADMIN_SESSION_SECRET` ni kamida 32 tasodifiy baytga teng maxfiy qiymat qilib yarating. Uni GitHub kodiga yozmang.
2. Ishonchli terminalda `node scripts/generate-admin-password-hash.js` buyrug‘ini bajaring. Parol terminalda ko‘rinmaydi. Chiqqan `ADMIN_PASSWORD_HASH=salt:hash` qiymatini hostingning Environment Variables bo‘limiga qo‘ying; parolning o‘zini emas.
3. Hosting environment variables ichida `ADMIN_SESSION_SECRET` va `ADMIN_PASSWORD_HASH` ni sozlab, serverni qayta ishga tushiring.
4. Sayt HTTPS orqali ishlashi shart, chunki admin cookie `Secure` bilan belgilanadi.

## Xulq-atvor

- 5 xato urinish: IP bo‘yicha 15 daqiqalik vaqtinchalik blok (xotirada saqlanadi; ko‘p server nusxali production uchun Redis kabi umumiy rate-limit ombori kerak).
- Admin sessiyasi 30 daqiqadan keyin tugaydi.
- Admin paneli sahifasi yashirilganda yoki sahifa yopilganda mijoz logout so‘rovini yuboradi. Qurilma to‘satdan o‘chsa yoki tarmoq uzilsa, bu so‘rov yetib bormasligi mumkin; 30 daqiqalik server sessiyasi muddati zaxira himoyadir.
- Server xotirasidagi bekor qilingan sessiyalar server qayta ishga tushganda unutiladi; qisqa TTL bu xavfni cheklaydi. Ishlab chiqarish uchun sessiya revokatsiyasi va login blokirovkasi umumiy doimiy omborga ko‘chirilishi lozim.
- Bu o‘zgarish admin panelini parol bilan himoyalaydi, ammo o‘zi deploy qilmaydi va agentlar bajarishini yoqmaydi. Mutaxassis agentlar xavfsizlik ko‘rib chiqilmaguncha bloklangan holda qoladi.
