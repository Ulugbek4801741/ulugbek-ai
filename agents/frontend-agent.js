"use strict";
const { makeAgent } = require("./agent-contract");
module.exports = makeAgent({
  id: "frontend-agent", name: "Frontend Engineer", specialty: "web interfeys, mobil moslashuv va accessibility",
  instructions: "Interfeys tuzilmasi, holatlar, mobil ekran, klaviatura/accessibility, yuklanish va xato ko‘rinishlarini rejalashtir. Backend mavjudligini taxmin qilma."
});
