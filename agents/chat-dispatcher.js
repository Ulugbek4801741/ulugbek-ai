"use strict";
const registry = require("./registry");
const memoryStore = require("./memory-store");

function chooseSpecialists(message) {
  const text = String(message || "").toLocaleLowerCase("uz");
  const selected = [];
  const add = (id) => { if (!selected.includes(id) && selected.length < 3) selected.push(id); };
  if (/(kod|dastur|ilova|sayt|web|apk|android|frontend|backend|api|program)/i.test(text)) {
    add("software-builder-agent"); add("backend-agent"); add("frontend-agent");
  }
  if (/(xavfsiz|himoya|parol|maxfiy|security|hujum|ruxsat)/i.test(text)) add("security-agent");
  if (/(sinov|test|xato|tekshir|ishlamay|bug)/i.test(text)) add("qa-agent");
  if (/(server|hosting|deploy|joylash|ishlash tez|tezlik|ishonchlilik)/i.test(text)) add("devops-agent");
  if (/(biznes|kompaniya|global|daromad|mijoz|marketing|reklama|bozor)/i.test(text)) add("product-growth-agent");
  if (/(izla|tadqiq|manba|internet|taqqosla|o‘rgan|organ)/i.test(text)) add("research-agent");
  if (selected.length === 0) add("core-architect");
  if (selected.length < 2) add("qa-agent");
  return selected;
}
function memoryMessages(turns) {
  return turns.flatMap(turn => [
    { role: "user", content: "Oldingi suhbatdagi vazifa: " + turn.user },
    { role: "assistant", content: "Oldingi javobim: " + turn.assistant }
  ]);
}
async function runChat({ message, sessionId, config, requestModel, signal }) {
  const session = memoryStore.validSession(sessionId);
  const coordinator = registry.getAgent("chat-coordinator");
  const coordinatorMemory = await memoryStore.getMemory(coordinator.id, session);
  const route = await requestModel(config, [
    { role: "system", content: coordinator.systemPrompt + "\nVazifani aniqlab, mos mutaxassis agentlar bilan maslahatlash. Foydalanuvchiga yakuniy javobni faqat mutaxassislar natijasini ko‘rib chiqqach ber. Hozirgi so‘rov uchun kerakli mutaxassislar: " + chooseSpecialists(message).join(", ") },
    ...memoryMessages(coordinatorMemory),
    { role: "user", content: "Foydalanuvchi so‘rovi: " + message + "\nFaqat qisqa ichki yo‘nalish ko‘rsatmasini ber; foydalanuvchiga yakuniy javob emas." }
  ], signal);
  const chosen = chooseSpecialists(message);
  const outputs = [];
  for (const id of chosen) {
    const agent = registry.getAgent(id);
    const prior = await memoryStore.getMemory(id, session);
    const answer = await requestModel(config, [
      { role: "system", content: agent.systemPrompt + "\nBu chatdagi o‘z oldingi xotirangdan foydalan. Aniq, amaliy va qisqa javob ber. Haqiqiy kodni o‘zgartirdim yoki sinadim deb aytma." },
      ...memoryMessages(prior),
      { role: "user", content: "Foydalanuvchi vazifasi: " + message + "\nChat koordinatori yo‘nalishi: " + route.slice(0, 1500) + "\nFaqat o‘z mutaxassisliging bo‘yicha yechim, xavf va tekshirish mezonini ber." }
    ], signal);
    outputs.push({ id, name: agent.name, answer });
    await memoryStore.remember(id, session, message, answer);
  }
  const final = await requestModel(config, [
    { role: "system", content: coordinator.systemPrompt + "\nSen yagona foydalanuvchi bilan gaplashadigan Chat Agentisan. Mutaxassislar javoblarini birlashtir, takrorlarni olib tashla, o‘zbek tilida sodda va aniq yakuniy javob ber. Bajarilmagan ish yoki testni bajarildi deb aytma." },
    ...memoryMessages(coordinatorMemory),
    { role: "user", content: "Foydalanuvchi so‘rovi: " + message + "\n\nMutaxassislar natijalari:\n" + outputs.map(x => "## " + x.name + "\n" + x.answer).join("\n\n") }
  ], signal);
  await memoryStore.remember(coordinator.id, session, message, final);
  return { reply: final, mode: "multi-agent", agents: outputs.map(x => ({ id: x.id, name: x.name })), memory: "per-agent-per-session" };
}
module.exports = { chooseSpecialists, runChat };
