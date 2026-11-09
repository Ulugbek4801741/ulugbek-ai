# PHP — 08/12

## Nima uchun
Server-rendered saytlar, web backend va CMS. PHP ko'p hosting muhitlarida mavjud; versiya va extensionsni tekshiring.

## Misol
```php
<?php
function greet(string $name): string {
    return "Salom, " . $name;
}
echo greet("Dunyo");
```
function e'lon qiladi; argument/return type; echo chiqaradi.

## Mavzular
- Variables $, scalar types, arrays, associative arrays.
- if/elseif/else, switch, foreach, while, match.
- Functions, nullable/union types, named args, closures.
- Classes, interfaces, traits, enums, namespaces, autoload.
- Exceptions, error handling, Composer, PSR standards.
- HTTP request/response, sessions, cookies, headers.
- PDO prepared statements, transactions, migrations.
- JSON, file upload, validation, password_hash/password_verify.
- PHP-FPM, OPcache, CLI, environment configuration.

## Mashq
```php
function safeTotal(float $price, int $qty): float {
    if ($price < 0 || $qty < 0) {
        throw new InvalidArgumentException("Manfiy qiymat");
    }
    return $price * $qty;
}
```

## Xavfsizlik
SQL uchun PDO prepared statements; outputda kontekstga mos escaping; CSRF token; password_hash; session cookie Secure/HttpOnly/SameSite; file upload MIME/size/content tekshiruvi; secrets environment orqali. User inputni eval yoki shell commandga bermang.

## Moslashtirish
Laravel/Symfony faqat loyiha ehtiyojiga mos bo'lsa. Controller–service–repository qatlamlari, validation, migrations va tests.

## O'zlashtirish
Xavfsiz login, PDO CRUD, validation, session va API endpointni test bilan yaratish.