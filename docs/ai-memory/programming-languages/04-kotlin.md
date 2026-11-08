# Kotlin — 04/12

## Nima uchun
Android ilovalari, JVM backend va multiplatform. Androidda lifecycle va coroutine qoidalari muhim.

## Minimal misol
```kotlin
fun greet(name: String): String = "Salom, $name"

fun main() {
    println(greet("Dunyo"))
}
```
fun funksiya; String tip; expression body; main kirish nuqtasi.

## Asosiy mavzular
- val (o'zgarmas binding), var (o'zgaruvchan); nullable `String?`; safe call `?.`, Elvis `?:`.
- Tiplar, string templates, ranges, when, if expression.
- List/MutableList, Set, Map; data class, enum, sealed class/interface.
- Funksiya, default/named args, extension, higher-order, lambda.
- Class, object, companion object, inheritance, interface, delegation.
- Generics, variance in/out, inline/reified.
- Exception; Result; resource lifecycle.
- Coroutine: suspend, launch, async, dispatcher, structured concurrency, cancellation.
- Flow/StateFlow; Android lifecycle-aware collection.
- Gradle, packages, visibility, testing.

## Mashq
```kotlin
data class Product(val price: Double, val quantity: Int)

fun total(p: Product): Double {
    require(p.price >= 0 && p.quantity >= 0)
    return p.price * p.quantity
}
```
data class qiymatga asoslangan model yaratadi; require shartni tekshiradi.

## Android moslashtirish
UI uchun Jetpack Compose yoki mavjud XML arxitekturasiga mos yondashing. ViewModel, repository, StateFlow, Room, WorkManager, permissions va lifecycle. Network ishini main thread'da bajarmang. Secretlarni APKga qattiq yozmang.

## Test
JUnit, coroutine test, Compose UI test; emulator va haqiqiy qurilma. Min SDK va Android API mosligini tekshiring.

## O'zlashtirish
Null safety, data/sealed class, coroutine, API repository va oddiy Android ekranini test bilan yaratish.