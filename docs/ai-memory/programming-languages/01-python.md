# Python — 01/12

## Nima uchun
Backend, avtomatlashtirish, ma'lumot tahlili, AI prototiplari va testlar. Python interpreter orqali ishlaydi; versiya va virtual environment loyihaga biriktiriladi.

## Minimal ishga tushirish
```python
def greet(name: str) -> str:
    return f"Salom, {name}!"

if __name__ == "__main__":
    print(greet("Dunyo"))
```
`def` funksiya e'lon qiladi; parametr va qaytish turi type hint; `return` natija qaytaradi; `if __name__...` fayl bevosita ishga tushganda bajaradi.

## Asosiy sintaksis
- O'zgaruvchi: `count = 3`; tiplar: int, float, str, bool, None.
- To'plamlar: list `[1,2]`, tuple `(1,2)`, dict `{"name":"Ali"}`, set `{1,2}`.
- Shart: `if/elif/else`; sikl: `for`, `while`; boshqaruv: `break/continue`.
- Funksiya: default argument, keyword argument, `*args/**kwargs`; scope va closure.
- OOP: class, instance, inheritance, composition, property, dataclass.
- Xatolar: `try/except/else/finally`; maxsus exception.
- Fayl: `with open(..., encoding="utf-8") as f`; JSON: `json.load/dump`.
- Modullar: `import`; paketlar; pip; venv; dependency pinning.
- Async: `async def`, `await`, asyncio; faqat I/O parallelizmi uchun to'g'ri tanlang.

## Muhim standart kutubxonalar
pathlib, os, sys, json, csv, datetime, logging, argparse, re, math, statistics, sqlite3, unittest, typing, collections, asyncio, subprocess (xavfsiz argumentlar bilan).

## Mashq: narx hisoblagich
```python
def total_price(price: float, quantity: int) -> float:
    if price < 0 or quantity < 0:
        raise ValueError("Manfiy qiymat mumkin emas")
    return round(price * quantity, 2)

print(total_price(12.5, 3))
```
Kutilgan natija: 37.5. Testda nol, manfiy qiymat, katta son va noto'g'ri tiplarni tekshiring.

## Sifat qoidalari
PEP 8, type hints, docstring, kichik funksiyalar, logging, pytest/unittest, dependency lock, secrets .env orqali va repoga kiritilmaydi. Inputni tekshiring; shell buyruqlarini string birlashtirib yubormang.

## Moslashtirish
API backend: FastAPI/Flask; ma'lumot: SQLAlchemy; test: pytest; AI/ML: PyTorch va scikit-learn faqat talab va resurs mos bo'lsa. Kutubxona versiyasini loyiha talabiga qarab tanlang, ko'r-ko'rona o'rnatmang.

## O'rganish mezoni
Foydalanuvchi misolni tushuntira olishi, funksiyani noldan yozishi, test yaratishi, xatoni topishi, modulga ajratishi va xavfsiz API yaratishi kerak.