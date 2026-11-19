"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createChatAgentAnswer, extractOriginalTask } = require("../modules/chat-agent-answer");
const { createAgentFleet } = require("../modules/agent-fleet");

test("extracts the original user task from a specialist prompt", () => {
  assert.equal(
    extractOriginalTask("Siz researcher agentsiz.\nFoydalanuvchi topshirig'i: Kogondan ish topib ber"),
    "Kogondan ish topib ber"
  );
});

test("uses native local reasoning when no hosted AI model is configured", async () => {
  const answer = createChatAgentAnswer({
    singleAgent: { async answer() { return null; } },
    loadNativeBrain: () => ({
      buildLocalReply(task, evidence, context) {
        assert.equal(task, "Kogondan ish topib ber");
        assert.deepEqual(evidence, [{ title: "Vacancy" }]);
        assert.equal(context.intent, "job-search");
        return { reply: "Mahalliy tekshiruv javobi", reasoning: { answerable: true } };
      }
    })
  });
  const result = await answer(
    "Siz researcher agentsiz.\nFoydalanuvchi topshirig'i: Kogondan ish topib ber",
    [{ title: "Vacancy" }],
    { intent: "job-search" }
  );
  assert.equal(result.reply, "Mahalliy tekshiruv javobi");
});

test("does not claim a native answer when the local engine has no evidence-backed result", async () => {
  const answer = createChatAgentAnswer({
    singleAgent: { async answer() { return null; } },
    loadNativeBrain: () => ({ buildLocalReply: () => ({ reply: "taxmin", reasoning: { answerable: false } }) })
  });
  assert.equal(await answer("Foydalanuvchi topshirig'i: Noma'lum fakt"), null);
});

test("runs specialist agents without requiring a hosted model key", async () => {
  const answer = createChatAgentAnswer({
    singleAgent: { async answer() { return null; } },
    loadNativeBrain: () => ({
      buildLocalReply: task => ({ reply: "Tekshirilgan mahalliy javob: " + task.slice(-80), reasoning: { answerable: true } })
    })
  });
  const fleet = createAgentFleet({ answer, concurrency: 2 });
  const result = await fleet.runTask("Internetdan manbalarni qidir va tekshir", {
    roles: ["researcher", "analyst", "verifier"]
  });
  assert.equal(result.ok, true);
  assert.equal(result.requestedAgents, 3);
  assert.equal(result.completedAgents, 3);
  assert.equal(result.lifecycle, "ephemeral-agents-deleted-after-task");
  assert.equal(fleet.status().activeAgents, 0);
});
