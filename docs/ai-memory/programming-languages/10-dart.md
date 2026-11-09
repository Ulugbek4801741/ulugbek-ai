# Dart — 10/12

## Nima uchun
Flutter orqali Android/iOS/web/desktop UI yaratish. Dart null-safety va async programmingni qo'llaydi.

## Misol
```dart
String greet(String name) => 'Salom, $name';

void main() {
  print(greet('Dunyo'));
}
```
Arrow expression qisqa funksiya; String qaytish turi; void qiymat qaytarmaydi.

## Mavzular
- final/const/var, built-in types, nullable types.
- List, Set, Map, records, pattern matching.
- if/switch/for/while, collection-if/for.
- Functions, optional/named parameters, closures.
- Classes, constructors, inheritance, mixins, interfaces, extensions.
- Futures, async/await, Streams, isolates.
- Packages, pubspec.yaml, dart pub.
- Exceptions, null-aware operators, late.
- Flutter widgets, state, navigation, forms, layout, platform channels.

## Mashq
```dart
double total(double price, int quantity) {
  if (price < 0 || quantity < 0) {
    throw ArgumentError('Manfiy qiymat mumkin emas');
  }
  return price * quantity;
}
```

## Flutter moslashtirish
Widget tree, StatelessWidget/StatefulWidget, state management, repository, navigation, responsive layout, accessibility. State management kutubxonasini loyiha hajmiga qarab tanlang; platform permission va lifecycle'ni tekshiring.

## Test va sifat
dart format, dart analyze, unit/widget/integration tests. Async errorni ushlang; network ishini UI threadga bloklamang; secretsni app ichiga joylamang.

## O'zlashtirish
Typed model, Future API, Stream, Flutter form va navigatsiyali kichik app qurish.