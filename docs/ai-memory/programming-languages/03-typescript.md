# TypeScript — 03/12

## Nima uchun
JavaScriptga statik tur tekshiruvi qo'shadi. TypeScript compile vaqtida JavaScriptga transpile qilinadi; runtime validator o'rnini bosmaydi.

## Minimal misol
```ts
type User = { id: number; name: string; active: boolean };

function displayName(user: User): string {
  return user.active ? user.name : "Faol emas";
}
```
type obyekt shaklini belgilaydi; parametr va qaytish turi tekshiriladi.

## Asosiy mavzular
- string, number, boolean, arrays, tuples, enum (union ko'pincha afzal), literal types.
- `type` va `interface`; optional `?`, readonly.
- Union `A | B`, intersection `A & B`, narrowing, discriminated union.
- Generics: `function first<T>(items: T[]): T | undefined`.
- `unknown` xavfsizroq; `any`ni cheklang; never, void, null/undefined.
- Utility types: Partial, Pick, Omit, Record, ReturnType.
- Classes, access modifiers, implements, abstract.
- Modules, tsconfig, strict mode, declaration files.
- Async Promise<T>, error typing; runtime validation Zod/Valibot kabi vosita bilan.
- Type assertion tekshiruv emas; tashqi JSONni avval validate qiling.

## Mashq
```ts
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.data;
}
```
Narrowing `ok` maydoniga qarab to'g'ri variantni ajratadi.

## Sifat
`strict: true`; noImplicitAny; lint; tsc --noEmit; unit/integration tests. API inputini faqat TypeScript type bilan ishonchli deb qabul qilmang.

## Moslashtirish
Frontend React + TypeScript; Node backend; shared DTO/schema. Build va test buyruqlarini package.jsonda aniq yozing.

## O'zlashtirish
JS kodini typed modelga o'tkazish, generic funksiya, union-based API result va runtime validation yozish.