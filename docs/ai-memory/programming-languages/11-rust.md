# Rust — 11/12

## Nima uchun
Xavfsiz systems programming, CLI, performance-critical servislar. Ownership/borrowing xotira xavfsizligini compile-time'da nazorat qiladi.

## Misol
```rust
fn greet(name: &str) -> String {
    format!("Salom, {name}")
}

fn main() {
    println!("{}", greet("Dunyo"));
}
```
&str borrow; String owned qiymat; format yangi String yaratadi.

## Mavzular
- let/mut, scalar/compound types, shadowing.
- Ownership, move, borrowing, references, lifetimes.
- Struct, enum, match, Option, Result, pattern matching.
- Functions, modules, crates, visibility.
- Collections: Vec, HashMap, String.
- Traits, generics, trait bounds, iterators, closures.
- Error handling Result/?; panic faqat exceptional holat.
- Cargo, dependencies, features, workspace.
- Threads, channels, async runtime tushunchasi.
- Unsafe Rust va FFI — faqat zarur va audit bilan.

## Mashq
```rust
fn safe_divide(a: f64, b: f64) -> Result<f64, &'static str> {
    if b == 0.0 {
        return Err("Nolga bo'lish mumkin emas");
    }
    Ok(a / b)
}
```
Result success/error variantlarini bildiradi; caller ikkisini ham ko'rib chiqadi.

## Sifat
cargo fmt, clippy, test, audit; dependency version va lockfile. Unsafe bloklarni minimallashtiring, concurrency va lifetime xatolarini tushuning.

## Moslashtirish
CLI, parser, embedded va yuqori samarali servislar. Async runtime (masalan Tokio) faqat async I/O zarur bo'lsa.

## O'zlashtirish
Ownershipni tushuntirish, Result bilan xato boshqarish, struct/enum, iterator va test yozish.