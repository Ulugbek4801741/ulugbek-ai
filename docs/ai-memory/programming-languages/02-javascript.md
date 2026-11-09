# JavaScript — 02/12

## Nima uchun
Brauzer interaktivligi, Node.js backend, web API va avtomatlashtirish. JavaScript ECMAScript standartiga amal qiladi.

## Minimal misol
```js
function greet(name) {
  return `Salom, ${name}!`;
}
console.log(greet("Dunyo"));
```
Funksiya qiymat qaytaradi; template literal `${}` orqali qiymat qo'shadi.

## Asosiy mavzular
- `const` va `let`; `var`ni yangi kodda ishlatmang.
- Primitive: string, number, bigint, boolean, undefined, null, symbol; object.
- Array, object, Map, Set; destructuring, spread/rest.
- `===` strict comparison; truthy/falsy; optional chaining `?.`; nullish `??`.
- Function declaration/expression, arrow function, callback, closure, scope, hoisting.
- Array metodlari: map, filter, reduce, find, some, every.
- OOP: prototype, class, inheritance, composition.
- Modul: import/export; package.json; npm/pnpm.
- Async: Promise, async/await, event loop; try/catch; AbortController.
- DOM: querySelector, addEventListener, form validation; XSSdan himoya.
- Node: fs/promises, path, http, process; API va streams.

## Mashq
```js
function sumPositive(values) {
  if (!Array.isArray(values)) throw new TypeError("Array kerak");
  return values
    .filter((n) => Number.isFinite(n) && n > 0)
    .reduce((sum, n) => sum + n, 0);
}
console.log(sumPositive([2, -1, 3, "4"])); // 5
```
filter mos elementlarni tanlaydi; reduce yig'adi; Number.isFinite noto'g'ri qiymatni rad etadi.

## Xavfsizlik va test
Untrusted HTML uchun innerHTML ishlatmang; textContent afzal. Serverda input validation, authz/authn, rate limit, CORS va CSRF kontekstini to'g'ri sozlang. Test: node:test/Jest/Vitest; lint: ESLint; format: Prettier.

## Moslashtirish
Frontend: React/Vue/Svelte; backend: Node + Express/Fastify; build: Vite. Framework tanlovi mavjud repo va deploymentga mos bo'lsin.

## O'zlashtirish
DOM hodisasini yozish, JSON API chaqirish, async xatoni boshqarish, test va kichik web ilovani mustaqil yaratish.