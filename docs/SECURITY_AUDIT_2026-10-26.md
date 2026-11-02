# ULUGBEK AI — dastlabki xavfsizlik auditi

Audit sanasi: 2026-10-26
Ko‘lam: GitHub repozitoriyasidagi kodni ko‘rib chiqish; bu penetratsion test yoki mustaqil sertifikat emas.

## Aniqlangan muhim xavflar

### 1. Anonim foydalanuvchi yuboradigan sessionId
`POST /api/chat` mijoz yuborgan `sessionId` qiymatini qabul qiladi va u agent xotirasini tanlashda ishlatiladi. Agar xotira shu ID bo‘yicha saqlansa, IDni bilgan boshqa shaxs shu sessiya kontekstiga aralashishga yoki uni taxmin qilishga urinishi mumkin. **Tuzatish talabi:** server yaratgan tasodifiy, imzolangan sessiya cookie/token, foydalanuvchi/tenant bilan bog‘lash, sessiya muddati va CSRF/CORS tekshiruvi; mijoz kiritgan IDga ishonmaslik.

### 2. Tezlik cheklovi xotirasi ko‘p nusxali hosting uchun yetarli emas
`express-rate-limit` standart xotira store’i bir nechta server nusxasida umumiy hisob yuritmaydi. Ishlab chiqarishda Redis yoki boshqa umumiy store, IP spoofing va reverse-proxy konfiguratsiyasi tekshiruvi kerak.

### 3. Xavfsizlik siyosati endpointi o‘zi enforcement emas
`modules/security-policy.js` siyosatni `policy-disclosure-only` deb belgilaydi. Har bir endpoint, agent va tashqi adapter alohida server tomonida tekshiruvdan o‘tishi shart. Faqat system prompt yoki UI ogohlantirishi hujumni to‘xtatmaydi.

### 4. Administrator sessiyalarini bekor qilish ko‘p nusxali serverda zaif
`revokedAdminSessions` jarayon xotirasida saqlanadi; bir nechta server nusxasi yoki restartdan keyin logout/revocation holati saqlanmasligi mumkin. Ishlab chiqarishda markaziy sessiya store, qisqa muddat, rotatsiya va audit log talab qilinadi.

### 5. Tashqi AI endpoint konfiguratsiyasi
`OPENAI_BASE_URL` server muhiti orqali belgilanadi. Uni faqat administrator sozlashi, HTTPS va ishonchli hostname allowlist bilan cheklashi, maxfiy tarmoq manzillariga so‘rov yuborish xavfini kamaytirishi kerak. So‘rov foydalanuvchi matni bilan endpointni o‘zgartirmasligi kerak.

### 6. Ochiq `/api/workflows` rejalashtirish endpointi
U tashqi amalni bajarmasligi va `executionAllowed:false` qoldirishi ijobiy. Shunga qaramay, ishlab chiqarishda autentifikatsiya, quota, audit va so‘rov suiiste’moliga qarshi himoya kerak.

### 7. Chatga kirish, ma’lumotlar va maxfiylik
Chat endpointi hozir autentifikatsiyasiz demo rejimda ham javob beradi. Ishlab chiqarishda foydalanuvchi hisobi, ma’lumotlarni foydalanuvchi bo‘yicha ajratish, saqlash muddati, o‘chirish eksporti, zaxira nusxasi, loglarda maxfiy ma’lumotlarni filtrlash va tenant izolatsiyasi talab etiladi.

## Hozircha tasdiqlanmagan xavfsizlik imkoniyatlari
- Real antivirus/APK sandbox yo‘q; zararli faylni to‘liq aniqlash kafolati yo‘q.
- Qurilma/kompyuterni boshqaradigan amaliy adapter yo‘q; shu sababli ruxsatni texnik nazorat qilishni real qurilmada tasdiqlab bo‘lmaydi.
- Foydalanuvchilar uchun hisobga bog‘langan 1 GB saqlash kvotasi va 100 TB pullik storage/billing backend yo‘q.
- PostgreSQL/tenant ma’lumotlar bazasi, umumiy rate-limit store va monitoringning ishlab chiqarish konfiguratsiyasi tasdiqlanmagan.
- Tashqi model API ishlatilsa, prompt va tegishli kontekst o‘sha serverga yuboriladi; bu holatda ma’lumot faqat ULUGBEK AI ichida qoladi deb bo‘lmaydi. Local model uchun Ollama/vLLM kabi o‘z serveridagi endpoint va tarmoq qoidalari kerak.

## Tuzatish tartibi (ustuvorlik)
1. Session ID va foydalanuvchi ma’lumotlarini ajratish; server tomonidan boshqariladigan sessiyalar.
2. Admin sessiyalarini markazlashtirish va barcha muhim amallarga audit log.
3. Rate limitni umumiy store bilan ishlatish; reverse proxy ishonchli manzillarini aniq belgilash.
4. SSRF/endpoint allowlist, xavfsiz chiqish so‘rovlari va secret management.
5. Har bir high-risk action uchun deny-by-default server enforcement va alohida inson tasdig‘i.
6. Zararli fayllarni xavfsiz sandboxda tekshirish; noma’lum fayllarni ishga tushirmaslik.
7. Authentication, privacy, deletion, backup/restore, load test, dependency/SBOM va OWASP testlari.

## Manbalar
- OWASP Top 10:2025 — Broken Access Control, Security Misconfiguration, Software Supply Chain Failures, Cryptographic Failures, Injection, Insecure Design, Authentication Failures, Software/Data Integrity, Logging & Alerting, Exceptional Conditions.
- NIST AI Risk Management Framework — AI xavflarini aniqlash, baholash va boshqarish.

## Halollik eslatmasi
Ushbu hujjat kodni statik ko‘rib chiqishdan topilgan xavflarni qayd etadi. U barcha zaifliklar topildi degani emas. Topilgan har bir muammo avtomatik ravishda tuzatildi deb hisoblanmaydi; har bir tuzatish uchun alohida commit, test va deployment dalili talab etiladi.

## 2026-10-26 qo‘shimcha tekshiruv
- `modules/input-safety.js` ga ruxsatsiz yashirin kuzatuv va shaxsiy/mijoz ma’lumotlarini noqonuniy chiqarib olishga oid dastlabki filtrlash qoidalari qo‘shildi.
- `test/input-safety.test.js` ga ushbu holatlar uchun regressiya testlari qo‘shildi.
- **Muhim ochiq xavf:** `/api/chat` sessiya identifikatorini mijozdan oladi. Haqiqiy foydalanuvchi autentifikatsiyasi va server tomonidan boshqariladigan sessiya izolyatsiyasi bo‘lmagani sababli, hozirgi xotirani maxfiy ko‘p foydalanuvchili ishlab chiqarish muhiti sifatida ishlatmaslik kerak.
- `OPENAI_BASE_URL` OpenAI-compatible self-hosted endpoint (masalan, Ollama) uchun ishlatilishi mumkin. Model serverda o‘rnatilmagan yoki endpoint sozlanmagan bo‘lsa, haqiqiy model javobi mavjud emas.
- Input regex filtri mutlaq himoya emas; mustaqil pentest, sessiya/ma’lumot izolyatsiyasi, SSRF, prompt injection, fayl yuklash va production konfiguratsiyasi testlari shart.
