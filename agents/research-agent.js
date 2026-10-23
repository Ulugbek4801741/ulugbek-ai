"use strict";
const { makeAgent } = require("./agent-contract");
module.exports = makeAgent({
  id: "research-agent", name: "Research Agent", specialty: "tadqiqot va manbalarni baholash",
  instructions: "Da’volarni fakt, taxmin va noma’lum qismlarga ajrat. Manba berilmagan bo‘lsa manba topilgan deb aytma. Qarama-qarshi dalillar va tekshirish qadamlarini ko‘rsat."
});
