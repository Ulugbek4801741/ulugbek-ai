"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const engine = require("../modules/coding-language-engine");

const cases = [
  ["src/main.py", "Python"], ["web/app.js", "JavaScript"],
  ["web/app.tsx", "TypeScript"], ["android/MainActivity.kt", "Kotlin"],
  ["web/index.html", "HTML/CSS"], ["native/core.cpp", "C/C++"],
  ["server/main.go", "Go"], ["server/index.php", "PHP"],
  ["android/Main.java", "Java"], ["mobile/main.dart", "Dart"],
  ["native/lib.rs", "Rust"], ["ios/App.swift", "Swift"]
];

test("catalog lists all twelve requested programming languages", () => {
  assert.equal(engine.supportedLanguages().length, 12);
});
for (const [filePath, language] of cases) {
  test(language + " source path is recognized", () => {
    assert.equal(engine.languageForPath(filePath), language);
    assert.equal(engine.validateSourcePath(filePath), filePath);
  });
}
test("rejects traversal, absolute paths, secrets and unsupported extensions", () => {
  for (const filePath of ["../escape.py", "/tmp/escape.py", ".env.py", "config/.env.prod.py", "secrets/key.py", "node_modules/pkg/index.js", "src\\..\\secret.py", "file.exe"]) {
    assert.throws(() => engine.validateSourcePath(filePath));
  }
});
test("normalizes safe generated files and records their language", () => {
  const result = engine.normalizeGeneratedFiles([{ path: "src/main.py", content: "print('hello')", reason: "entry point" }]);
  assert.equal(result[0].language, "Python");
});
test("rejects duplicate paths, empty files and oversized proposals", () => {
  assert.throws(() => engine.normalizeGeneratedFiles([{path:"a.py",content:"x"},{path:"a.py",content:"y"}]));
  assert.throws(() => engine.normalizeGeneratedFiles([{path:"a.py",content:"  "}]));
  assert.throws(() => engine.normalizeGeneratedFiles([{path:"a.py",content:"x".repeat(20)}], {maxFileChars:10}));
});
