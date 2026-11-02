# ULUGBEK AI — Multi-Agent Core va bo‘ysunuvchi agentlar arxitekturasi

**Holat:** arxitektura spetsifikatsiyasi va ishlab chiqish rejasi. Ushbu hujjatdagi agentlar hali avtomatik ravishda ishlab turganini anglatmaydi. Ularni real ishlatish uchun runtime, navbat, model adapterlari, ruxsatlar, saqlash va testlar bosqichma-bosqich amalga oshiriladi.

## 1. Asosiy tamoyil

Bitta ulkan agent hamma ishni yolg‘iz bajarishga urinmaydi. ULUGBEK AI foydalanuvchi bilan gaplashadigan agentlarni va ichki ishchi agentlarni **Multi-Agent Core** orqali boshqaradi. Core vazifani tushunadi, kichik vazifalarga ajratadi, mos yo‘nalish rahbariga beradi, natijalarni birlashtiradi va mustaqil tekshirtiradi.

Agentlar soni emas, bajarilgan vazifaning sifati, xavfsizligi, narxi va testdan o‘tishi asosiy ko‘rsatkich bo‘ladi.

## 2. Ierarxiya

```text
Foydalanuvchi
  |
  v
ULUGBEK AI Chat / Voice / Web / Mobile interfeyslari
  |
  v
1. Multi-Agent Core (bosh orkestrator)
  |-- Intent & Language Router
  |-- Task Planner / Decomposer
  |-- Policy & Permission Gate
  |-- Budget / Deadline Manager
  |-- Memory & Context Selector
  |-- Result Merger
  |-- Independent Verifier
  |-- Human Approval Gate
  |
  +--> 2. Yo‘nalish Core-lari (coordinatorlar)
  |      |-- AI & Knowledge Core
  |      |-- Software Builder Core
  |      |-- Research & Web Core
  |      |-- QA & Verification Core
  |      |-- Security & Privacy Core
  |      |-- Cloud & DevOps Core
  |      |-- Social & Media Core
  |      |-- Business & Marketplace Core
  |      |-- Voice & Localization Core
  |      |-- Product & Growth Core
  |
  +--> 3. Ixtisoslashgan agent rollari (masalan, Backend, Tester)
          |
          v
       4. Vaqtinchalik worker nusxalari
          |
          v
       Natijalar -> Verifier -> (kerak bo‘lsa inson tasdig‘i) -> foydalanuvchi
```

## 3. Chat agentlari va ichki agentlar farqi

### A. Foydalanuvchi bilan ishlaydigan agentlar
- **General Chat Agent:** umumiy savol-javob va vazifani aniqlashtirish.
- **Voice & Language Agent:** nutqni matnga aylantirish, tarjima va ovozli javob integratsiyasi.
- **Project Assistant:** foydalanuvchining loyihasi, maqsadi va vazifalarini kuzatadi.
- **App Builder Chat Agent:** ilova yoki sayt talablarini yig‘ib, qurilish rejasini tayyorlaydi.
- **Business Assistant:** bozor, marketing va xizmatlar bo‘yicha tahlil tayyorlaydi.

Bu agentlar foydalanuvchiga javob beradi, lekin o‘zlari cheksiz vakolat bilan serverga yoki tashqi tizimlarga buyruq bermaydi. Kerakli ishni Multi-Agent Core’ga topshiradi.

### B. Boshqaruvchi agentlar
- **Multi-Agent Core:** butun tizim bo‘yicha yagona orkestrator.
- **Domain Coordinator:** faqat o‘z yo‘nalishidagi vazifalarni taqsimlaydi.
- **Task Planner:** vazifani kichik, tekshiriladigan bosqichlarga bo‘ladi.
- **Verifier/Judge:** natijani talablar va testlar bilan tekshiradi; ishni bajargan agentning o‘zi yakuniy bahoni bermaydi.
- **Safety Gatekeeper:** ruxsatlar, maxfiylik, xavf va xarajat cheklovlarini tekshiradi.

### C. Ish bajaruvchi agentlar
Misollar: Backend Engineer, Frontend Engineer, Database Engineer, Researcher, Source Checker, Test Engineer, Security Reviewer, Android Build Agent, Documentation Agent. Har birining aniq vazifasi, ruxsat etilgan vositalari va qabul mezonlari bo‘ladi.

## 4. Core’ning vazifa bajarish algoritmi

1. Foydalanuvchi so‘rovini qabul qilish va tilini aniqlash.
2. Maqsad, natija formati va yetishmayotgan ma’lumotni aniqlash.
3. Xavf darajasini belgilash: past, o‘rta yoki yuqori.
4. Vazifani mustaqil kichik ishlarga ajratish; bog‘liqliklar grafigini yaratish.
5. Har bir ishni kerakli Domain Coordinator va ixtisoslashgan agentga yuborish.
6. Workerlar faqat ruxsat etilgan vositalar va ajratilgan budjet bilan ishlaydi.
7. Natijalarni dalillar, fayl havolalari, testlar va xatolar bilan qaytarish.
8. Mustaqil Verifier tekshiradi; xato bo‘lsa cheklangan miqdorda qayta ishlashga yuboradi.
9. Xavfli ishlar uchun inson tasdig‘ini kutish.
10. Natijalarni birlashtirib, foydalanuvchiga bajarilgan, bajarilmagan va tekshirilmagan qismlarni ochiq ko‘rsatish.
11. Audit jurnaliga qarorlar va ish holatini yozish.

## 5. Har bir agent uchun standart shartnoma

Har bir vazifa kamida quyidagi maydonlarga ega bo‘lishi kerak:

- `task_id`, `parent_task_id`, `correlation_id`
- `agent_role`, `coordinator`, `goal`, `input_refs`
- `allowed_tools`, `permission_scope`
- `budget_limit`, `timeout_seconds`, `retry_limit`
- `expected_output`, `acceptance_tests`
- `status`: queued / running / blocked / review / approved / failed / cancelled
- `evidence`, `test_results`, `error_summary`, `audit_events`
- `requires_human_approval`, `rollback_plan`

Agentlar o‘zlariga berilmagan huquqni boshqa agentdan so‘rab olish yoki cheklovlarni prompt orqali bekor qilish imkoniga ega bo‘lmasligi kerak.

## 6. Vakolatlar va xavfsizlik

- Oddiy chat agenti faqat javob berishi yoki vazifa yaratishni so‘rashi mumkin.
- Research agenti internet ma’lumotini topishi mumkin, ammo sahifadagi ko‘rsatmalarni tizim buyrug‘i deb qabul qilmaydi.
- Coder agenti avval kod taklifini alohida branch yoki sandboxda tayyorlaydi.
- Tester agenti testlarni ishga tushiradi va natijalarni saqlaydi.
- Reviewer agenti kod, xavfsizlik va test natijalarini alohida tekshiradi.
- Production deploy, to‘lov, foydalanuvchi ma’lumotlarini o‘chirish, ruxsatlarni o‘zgartirish va moliyaviy/huquqiy harakatlar uchun inson tasdig‘i shart.
- API kalitlari faqat server tomonida saqlanadi; agent promptlariga sirlar kiritilmaydi.
- Agentlar soni, parallel ishlar, vaqt, tokenlar va xarajatlar qat’iy limitlanadi.
- Xato yoki shubhali harakat aniqlansa, vazifa to‘xtatiladi va audit yozuvi yaratiladi.

## 7. 14 000 ta ilova/xizmat maqsadiga to‘g‘ri yondashuv

14 000 ta alohida ishlab chiqarish darajasidagi mahsulotni bir oyda qo‘lda yoki mustaqil agentlar bilan sifatli yaratish kafolatlanmaydi. To‘g‘ri maqsad — avval **bitta App Factory platformasi** va qayta ishlatiladigan, testlangan shablonlar tizimini yaratish. Keyin katalogdagi xizmatlarni shablon, komponent va konfiguratsiyalardan ko‘paytirish mumkin.

Har bir yaratilgan mahsulot uchun:
- shablon va konfiguratsiya versiyasi;
- avtomatik build va test holati;
- xavfsizlik tekshiruvi;
- deploy tasdig‘i;
- monitoring va rollback imkoniyati bo‘lishi kerak.

Bir xil shablondan 14 000 ta nusxa yaratish 14 000 ta mustaqil, xavfsiz va foydalanuvchiga tayyor mahsulot borligini anglatmaydi.

## 8. Amalga oshirish bosqichlari

### 1-bosqich — ishlaydigan minimal Core
1. Task contract va statuslar.
2. Multi-Agent Core: rejalashtirish, agent tanlash, natijalarni birlashtirish.
3. 5 ta real rol: Planner, Researcher, Builder/Coder, Tester, Reviewer.
4. Bitta umumiy task store va navbat.
5. Admin panelda vazifani ko‘rish, bekor qilish va tasdiqlash.
6. Testlar va audit jurnali.

### 2-bosqich — ishonchli ishga tushirish
1. JSON fayl o‘rniga bardoshli PostgreSQL saqlash.
2. Alohida worker va ishonchli navbat.
3. Retry, timeout, idempotency va vazifani qayta tiklash.
4. Model adapterlari va xarajat limitlari.
5. Monitoring, loglar, backup va restore sinovlari.

### 3-bosqich — yo‘nalish Core-lari
10 ta coordinatorni bittadan qo‘shish; har biri uchun alohida testlar va ruxsatlar. Faqat real talab bo‘lganda parallel workerlar sonini oshirish.

### 4-bosqich — App Factory va global mahsulot
Avval bir nechta turdagi web-ilova shablonlarini to‘liq build/test/deploy qilish. Foydalanuvchi sinovlari va ishlab chiqarish ko‘rsatkichlari ijobiy bo‘lgach, shablonlar katalogini kengaytirish.

## 9. Hozirgi kod bilan bog‘lanishi

Mavjud `agent-runtime.js` va `/api/admin/tasks` — boshlang‘ich navbat va topshiriq boshqaruvi. Ularni to‘liq Multi-Agent Core deb hisoblamaslik kerak: hozirgi bosqichda agentlar reja/tahlil natijasini qaytarishi mumkin, lekin kodni xavfsiz muhitda mustaqil tahrirlash, real testni bajartirish va productionga chiqarish uchun alohida vositalar, sandbox va tasdiqlash mexanizmi hali kerak.

Keyingi texnik vazifa: ushbu hujjatdagi **Task Contract + Coordinator Registry + Planner/Dispatcher + Verifier** qismlarini alohida modullar sifatida kodga kiritish va har birini testlash.
