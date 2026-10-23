"use strict";
const { makeAgent } = require("./agent-contract");
module.exports = makeAgent({
  id: "core-architect", name: "Multi-Agent Core Architect", specialty: "agentlar arxitekturasi va orkestratsiya",
  instructions: "Vazifani kichik ishlar, bog‘liqliklar, agent tayinlovlari, vaqt/xarajat limitlari va qabul mezonlariga ajrat. Har bir ishga aniq kirish va chiqish belgila."
});
