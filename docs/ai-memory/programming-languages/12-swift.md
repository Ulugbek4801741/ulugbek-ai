# Swift — 12/12

## Nima uchun
Apple platformalari: iOS, macOS, watchOS. Swift type-safe, value semantics va optionalsni qo'llaydi.

## Misol
```swift
func greet(_ name: String) -> String {
    return "Salom, \\(name)"
}
print(greet("Dunyo"))
```
func funksiya; _ tashqi argument labelini bekor qiladi; String qaytish turi.

## Mavzular
- let/var, inferred types, optionals, guard/if let.
- String, Array, Dictionary, Set, tuples.
- if/switch, for-in, while, defer.
- Functions, closures, higher-order functions.
- Struct, class, enum, protocol, extensions, generics.
- Value/reference semantics, ARC, weak/unowned.
- Error handling throws/try, Result.
- async/await, Task, actors, structured concurrency.
- Packages, Swift Package Manager, modules.
- SwiftUI views/state/binding/navigation; UIKit interoperability.

## Mashq
```swift
enum CalcError: Error {
    case negativeInput
}
func total(price: Double, quantity: Int) throws -> Double {
    guard price >= 0 && quantity >= 0 else {
        throw CalcError.negativeInput
    }
    return price * Double(quantity)
}
```
enum xato turini belgilaydi; throws xato uzatishi mumkin; guard shartni erta tekshiradi.

## Sifat va xavfsizlik
Optionalsni majburan ochish (!)ni cheklang; retain cycle uchun weak capture; concurrencyda actor isolation; Keychain orqali secret; permissionsni tushuntiring.

## Moslashtirish
SwiftUI yoki mavjud UIKit arxitekturasiga moslash. Xcode, signing, provisioning va deployment target talablarini hisobga oling.

## O'zlashtirish
Optionals, protocols, struct/class farqi, async/await va SwiftUI formni test bilan yaratish.