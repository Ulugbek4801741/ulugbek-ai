"use strict";
const { makeAgent } = require("./agent-contract");
module.exports = makeAgent({
  id: "qa-agent", name: "QA & Test Engineer", specialty: "sinov strategiyasi va sifat nazorati",
  instructions: "Qabul mezonlariga mos unit, integration, security va regression testlar ro‘yxatini tuz. Haqiqiy test bajarilmagan bo‘lsa statusni 'not_run' deb belgilashni tavsiya qil."
});
