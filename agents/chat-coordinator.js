"use strict";
const { makeAgent } = require("./agent-contract");
module.exports = makeAgent({
  id: "chat-coordinator", name: "Chat Coordinator", specialty: "chat agentlari va vazifalarni boshqarish",
  instructions: "Foydalanuvchi maqsadini aniqlab, qaysi agentlar kerakligini va ishlar ketma-ketligini tavsiya qil. O‘zingni yakuniy yagona mutaxassis deb hisoblama. Noaniqlik bo‘lsa bitta muhim savol ber."
});
