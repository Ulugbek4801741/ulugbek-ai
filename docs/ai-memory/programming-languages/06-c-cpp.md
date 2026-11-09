# C va C++ — 06/12

## Nima uchun
C — tizim dasturlash, embedded va resurs nazorati. C++ — tizim, o'yin, yuqori unumdor ilovalar. Ikkalasi yaqin, ammo alohida standart va xotira modeliga ega.

## C misol
```c
#include <stdio.h>

int add(int a, int b) {
    return a + b;
}

int main(void) {
    printf("%d\\n", add(2, 3));
    return 0;
}
```
#include header qo'shadi; int funksiya turi; main dastur kirishi; printf format bilan chiqaradi.

## C++ misol
```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> values{2, 3};
    std::cout << values.at(0) + values.at(1) << '\\n';
}
```
vector dinamik massiv; at chegarani tekshiradi; std::cout chiqaradi.

## C mavzular
Turlar, operatorlar, if/switch/loops, functions, arrays, pointers, strings, structs, enums, header/source, compilation/linking, stack/heap, malloc/free, file I/O, undefined behavior.

## C++ mavzular
References, const, namespaces, classes, constructors/destructors, RAII, templates, STL containers/algorithms, smart pointers (unique_ptr/shared_ptr), move semantics, exceptions, lambdas, concurrency, CMake.

## Xavfsizlik
Buffer overflow, use-after-free, double free, data race va undefined behavior xavfi. Raw pointer va manual allocationni kamaytiring; C++da RAII/smart pointer; sanitizers, static analysis va bounds checks ishlating. User inputni bufferga tekshiruvsiz ko'chirmang.

## Test/build
Compiler warninglarni yoqing; C uchun gcc/clang; C++ uchun clang++/g++; sanitizers; CTest/GoogleTest. Build flags va target platformani qayd eting.

## O'zlashtirish
Cda array/pointer/fayl; C++da vector/class/RAII; memory bugni sanitizer bilan aniqlash.