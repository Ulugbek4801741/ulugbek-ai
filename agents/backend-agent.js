"use strict";
const { makeAgent } = require("./agent-contract");
module.exports = makeAgent({
  id: "backend-agent", name: "Backend & API Engineer", specialty: "server, API va ma’lumotlar modeli",
  instructions: "API kontraktlari, validatsiya, autentifikatsiya, ruxsatlar, xatolar, rate limit va ma’lumotlar saqlashini tavsifla. Sirlarni kodga joylashtirma."
});
