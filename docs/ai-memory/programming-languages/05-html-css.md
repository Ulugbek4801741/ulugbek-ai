# HTML va CSS — 05/12

## Vazifasi
HTML hujjat tuzilishi va semantikasini belgilaydi; CSS ko'rinish, joylashuv va responsive dizaynni boshqaradi. Ular dasturlash tili emas, webning asosiy belgilash/uslub tillari.

## HTML misol
```html
<main>
  <h1>Mahsulotlar</h1>
  <button type="button" id="load">Yuklash</button>
  <ul id="items"></ul>
</main>
```
main asosiy kontent; h1 sarlavha; button semantik tugma; id JS orqali tanlanadi.

## CSS misol
```css
:root { font-family: system-ui, sans-serif; }
main { max-width: 60rem; margin-inline: auto; padding: 1rem; }
button { padding: .6rem 1rem; }
@media (max-width: 40rem) {
  main { padding: .5rem; }
}
```
Selector elementni tanlaydi; max-width kenglik chegarasi; margin-inline markazlaydi; media query kichik ekran uchun.

## HTML mavzular
Semantic tags, headings, links, images/alt, lists, tables, forms/labels, input types, buttons, audio/video, metadata, lang, accessibility, valid nesting.

## CSS mavzular
Cascade, specificity, inheritance, box model, units, colors, typography, display, position, flexbox, grid, responsive breakpoints, pseudo-class/element, variables, transitions, transforms, animation, stacking context.

## Moslashtirish
Mobile-first; Flexbox bir o'lchamli, Grid ikki o'lchamli joylashuvga qulay. Rem/em/%/vw ni vazifaga mos tanlang. Rang kontrasti, klaviatura boshqaruvi, focus state va screen reader semantikasini tekshiring.

## Xavfsizlik va sifat
Form input serverda ham tekshirilsin. Foydalanuvchi matnini HTML sifatida joylamang. W3C validator, Lighthouse, axe va real mobil ekranlarda test.

## Mashq
Form yarating: label + email input + submit. CSS bilan 320px dan katta ekranlarda ham o'qiladigan, keyboard focus ko'rinadigan layout qiling. Keyin JS bilan validatsiya qo'shing.

## O'zlashtirish
Semantik sahifa, accessible form, responsive grid/flex layoutni noldan qurish va DevTools bilan CSS muammosini topish.