# Java — 09/12

## Nima uchun
Android, enterprise backend, desktop va katta JVM ekotizimi. Java compile bo'lib bytecode JVMda ishlaydi.

## Misol
```java
public class Main {
    static String greet(String name) {
        return "Salom, " + name;
    }
    public static void main(String[] args) {
        System.out.println(greet("Dunyo"));
    }
}
```
class tip; static method instance talab qilmaydi; main kirish nuqtasi.

## Mavzular
- Primitive/reference types, variables, operators, casting.
- if/switch, loops, arrays, String.
- Methods, overloading, varargs, access modifiers.
- Classes, constructors, encapsulation, inheritance, interfaces, records, enums.
- Generics, collections, streams, Optional.
- Exceptions checked/unchecked, try-with-resources.
- Packages, modules, Maven/Gradle, JAR.
- Threads, ExecutorService, CompletableFuture, synchronization.
- JDBC, transactions, HTTP client, serialization.
- JUnit, logging, JVM memory and garbage collection.

## Mashq
```java
static int total(int price, int quantity) {
    if (price < 0 || quantity < 0) {
        throw new IllegalArgumentException("Manfiy qiymat");
    }
    return Math.multiplyExact(price, quantity);
}
```
Math.multiplyExact overflow bo'lsa exception beradi.

## Sifat
Encapsulation, immutable DTO, resource closing, explicit error handling, dependency updates. Serializationda noma'lum inputga ishonmang; SQL prepared statement ishlating.

## Moslashtirish
Androidda Kotlin bilan birga ishlashi mumkin; Spring Boot backend; JUnit tests. Framework va JDK versiyasi build faylda aniq pin qilinsin.

## O'zlashtirish
OOP model, collections, exception, JDBC/API va JUnit bilan kichik servis yaratish.