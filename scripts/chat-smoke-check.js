"use strict";

const fs = require("node:fs");
const path = require("node:path");

function decodeEntities(value) {
  return String(value || "")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&lsquo;|&rsquo;/gi, "’")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ");
}

function isAcceptableChatReply(value) {
  const reply = decodeEntities(value).toLocaleLowerCase("uz");
  const safeFallback = reply.includes("mavzusiga mosligi tekshiruvidan o‘tmadi") ||
    reply.includes("mavzusiga mosligi tekshiruvidan o'tmadi");
  const onTopic = /hindiston|india/.test(reply) &&
    /aholi|population|soni|million|milliard|billion/.test(reply);
  return Boolean(reply.trim()) && (safeFallback || onTopic);
}

function main() {
  const file = path.resolve(process.argv[2] || "reports/chat-smoke.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!isAcceptableChatReply(data.reply)) {
    throw new Error("Chat mavzuga mos javob bermadi: " + decodeEntities(data.reply).slice(0, 280));
  }
  process.stdout.write("Chat smoke test passed; mode=" + (data.mode || "unknown") + "\n");
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    process.stderr.write(String(error.message || error) + "\n");
    process.exitCode = 1;
  }
}

module.exports = { decodeEntities, isAcceptableChatReply };
