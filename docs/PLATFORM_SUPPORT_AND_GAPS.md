# ULUGBEK AI: Windows, iPhone va Android holati

## Hozirgi holat
- **Web/PWA:** `public/manifest.webmanifest` va `public/sw.js` orqali o‘rnatiladigan veb-ilova yo‘li mavjud. HTTPS domenida brauzer orqali o‘rnatish mumkin; brauzer/PWA cheklovlari saqlanadi.
- **Android:** Capacitor Android konfiguratsiyasi va APK build workflow mavjud. APK faqat GitHub Actions build muvaffaqiyatli tugab, artefakt tekshirilgandan keyin tayyor deb hisoblanadi.
- **Windows:** hozircha alohida .exe/MSIX ilova yo‘q. Veb-ilovani Edge/Chrome orqali o‘rnatish PWA usuli; bu native Windows boshqaruv ilovasi emas.
- **iPhone/iPad:** HTTPS orqali Safari’da veb-ilovani Home Screen’ga qo‘shish mumkin. Bu App Store’da chiqarilgan native iOS ilovasi emas.
- **Native iOS:** Capacitor iOS target, Apple signing certificate, provisioning profile va macOS/Xcode build kerak. Bu repozitoriyada ularning borligi tasdiqlanmagan.

## ULUGBEK AI o‘z xizmatlari
`@Plugins` katalogidagi ULUGBEK xizmatlari ichki prototiplar: eslatmalar qurilmada saqlanadi; kalkulyator va matn hisoblagichi brauzerda ishlaydi; no-code bo‘limi agent API’ga loyiha rejasi so‘rovini yuboradi. Navigator/Mars kabi tashqi havolalar mustaqil ULUGBEK xizmati emas va shu tarzda belgilanishi kerak.

## Xotira va maxfiylik
- Hozirda har bir hisobga 1 GB server xotirasi ajratilganini tasdiqlovchi kvota, autentifikatsiya, billing va object-storage backend yo‘q.
- 100 TB pullik reja hozircha mahsulotga ulanmagan. Uni taklif qilishdan oldin real storage provayderi, kvotalar, to‘lovlar, zaxira nusxalari, shifrlash va xarajat nazorati kerak.
- Qurilma boshqaruvi har bir amal oldidan tushunarli ruxsat va bekor qilish yo‘li bilan ishlashi kerak. Bu loyiha hozir universal telefon/kompyuter boshqaruvini taqdim etmaydi.
- Antivirus funksiyasi uchun real fayl skaneri yoki tekshirilgan xavfsizlik API integratsiyasi hali yo‘q. Faqat havolani ochish antivirus hisoblanmaydi.

## Release talablar
1. `npm test` va JavaScript sintaksis testlari muvaffaqiyatli bo‘lishi.
2. Android APK workflow muvaffaqiyatli yakunlanishi va artefaktni o‘rnatib sinash.
3. PWA’ni Android, iPhone Safari, Windows Edge/Chrome’da alohida sinash.
4. Serverdagi autentifikatsiya, ma’lumotlar bazasi, xotira kvotasi, billing va fayl yuklash integratsiyalarini test qilish.
5. Xavfsizlik auditi, maxfiylik siyosati, shartlar, accessibility va har bir bozor uchun qonuniy tekshiruv.