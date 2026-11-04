# ULUGBEK AI — har 5 daqiqalik ovozli hisobot

## Ishlash tartibi
- Server har 5 daqiqada tizim holati bo‘yicha bitta o‘zbekcha hisobot yaratadi.
- Hisobotga server ishlash vaqti, mahalliy model holati, bilim o‘rganish sikllari, dasturchi moduli holati, vazifalar soni va xavfsizlik holati kiradi.
- Shaxsiy chat matnlari, parollar, tokenlar va vazifa matnlari hisobotga qo‘shilmaydi.
- Oxirgi 48 ta hisobot ULUGBEK_DATA_DIR ichidagi voice-reports.json faylida saqlanadi.
- GET /api/reports/latest eng so‘nggi hisobotni beradi; GET /api/reports/status hisobot xizmati holatini beradi.

## Android
APK build vaqtida scripts/install-android-voice-report.js Capacitor yaratgan Android loyihasiga native foreground media-playback service va Capacitor pluginini o‘rnatadi. Foydalanuvchi ilova ochiq paytda sozlamadagi avtomatik hisobotni yoqadi. Shundan keyin xizmat ekran o‘chiq bo‘lganda ham serverdan yangi hisobotni har 5 daqiqada tekshiradi va Android TextToSpeech orqali o‘qiydi. Doimiy bildirishnoma xizmat ishlayotganini ko‘rsatadi. Ilova sozlamasidan o‘chirish mumkin.

Android TTS o‘zbekcha ovozni qurilmada o‘rnatilgan ovoz dvigateli qo‘llasa ishlatadi; aks holda tizimdagi standart ovozga qaytadi. Telefonning batareya optimizatsiyasi, ishlab chiqaruvchi cheklovlari, ovoz balandligi, TTS ma’lumotlari va tarmoq holati ta’sir qilishi mumkin.

## Hosting cheklovi
Render Free web service 15 daqiqa kiruvchi trafik bo‘lmasa uxlab qoladi va doimiy disk bermaydi. Shu sababli besh daqiqalik schedulerning uzluksiz ishlashi Free rejimida kafolatlanmaydi. 24/7 hisobot uchun doimiy ishlaydigan pullik web service yoki alohida background worker hamda doimiy saqlash (PostgreSQL yoki persistent disk) kerak. Android xizmatining o‘zi ham server uxlab qolsa yangi hisobot yarata olmaydi.

## Tekshirish
- npm test
- Android CI: ./gradlew assembleDebug
- Real Android qurilmada: xizmatni ilova ichidan yoqish, ekran qulflash, kamida 10 daqiqa kutish, ikki hisobot ovozini va bildirishnomani tekshirish.
- Avtomatik testlar haqiqiy telefon audio ijrosini yoki Render uptime'ini isbotlamaydi.
