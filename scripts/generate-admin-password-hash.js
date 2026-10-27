"use strict";
// Run only in a trusted terminal. The password is entered without echo and never printed.
const crypto = require("node:crypto");
if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error("Bu yordam interaktiv, himoyalangan terminalda ishga tushirilishi kerak.");
  process.exit(1);
}
const salt = crypto.randomBytes(16).toString("hex");
const chunks = [];
process.stdout.write("Yangi administrator parolini kiriting (kamida 12 belgi): ");
if (process.stdin.isTTY && process.stdin.setRawMode) process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on("data", chunk => {
  for (const byte of chunk) {
    if (byte === 3) { process.stdout.write("\\nBekor qilindi.\\n"); process.exit(1); }
    if (byte === 13 || byte === 10) {
      if (process.stdin.setRawMode) process.stdin.setRawMode(false);
      process.stdin.pause();
      const password = Buffer.concat(chunks).toString("utf8");
      process.stdout.write("\\n");
      if (password.length < 12) { console.error("Parol kamida 12 belgidan iborat bo‘lsin."); process.exit(1); }
      const hash = crypto.scryptSync(password, salt, 64).toString("hex");
      process.stdout.write("ADMIN_PASSWORD_HASH=" + salt + ":" + hash + "\\n");
      process.exit(0);
    }
    if (byte === 127 || byte === 8) chunks.pop();
    else chunks.push(Buffer.from([byte]));
  }
});
