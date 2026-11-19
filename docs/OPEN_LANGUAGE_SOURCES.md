# ULUGBEK AI — ochiq til manbalari

## Ulangan manba
- Tatoeba API v1: o‘zbek (uzb), ingliz (eng) va rus (rus) jumlalari. Har olti soatda cheklangan miqdorda olinadi.
- Jumla manzili, Tatoeba litsenziyasi va muallif/foydalanuvchi atributsiyasi yozuv bilan saqlanadi.

## Katalogda ro‘yxatga olingan manbalar
- Universal Dependencies: grammatik belgilangan treebanklar. Har bir treebank litsenziyasi alohida tekshiriladi.
- OPUS: parallel korpuslar; ichidagi korpuslarning litsenziyalari turlicha.
- Leipzig Corpora Collection: bir tilli korpuslar; har bir dataset shartlari tekshiriladi.
- Wikipedia: mavjud ochiq sahifa yig‘ish mexanizmi orqali.

## O‘rganish siyosati
- Yangi jumlalar pending-review holatida saqlanadi.
- Ular til statistikasi, so‘z ketma-ketligi va til namunalarini o‘rganishga ishlatilishi mumkin.
- Ular avtomatik ravishda faktik bilim sifatida tasdiqlanmaydi.
- Har bir Tatoeba yozuvida manba URL, litsenziya va atributsiya saqlanadi.
- Ochiq manbalar huquqiy litsenziyasi aniq bo‘lmasa, ommaviy yuklab olish yoqilmaydi.
- Bu jarayon neyron GPT modelini o‘qitmaydi; hozirgi modul mahalliy n-gram statistik til modelini yangilaydi.

## Tekshirish
- GET /api/language/sources — ulangan manbalar va oxirgi sinxronlash holati.
- GET /api/language/status — til moduli va o‘rganish holati.
- POST /api/admin/language/sources/sync — admin token bilan manbalarni majburiy yangilash.