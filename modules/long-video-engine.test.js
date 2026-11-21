"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { buildScenePlan, createLongVideoEngine } = require("./long-video-engine");

test("60 daqiqalik film 360 ta 10 soniyalik sahnaga bo‘linadi", () => {
  const plan = buildScenePlan({ title: "Tarixiy film", story: "Tarixiy voqea", durationMinutes: 60 });
  assert.equal(plan.scenes.length, 360);
  assert.equal(plan.durationSeconds, 3600);
  assert.equal(plan.scenes.at(-1).endSeconds, 3600);
});

test("davomiylik chegaradan tashqarida rad etiladi", () => {
  assert.throws(() => buildScenePlan({ story: "Hikoya", durationMinutes: 121 }), /1–120/);
});

test("loyiha saqlanadi va sahna holati yangilanadi", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-video-"));
  try {
    const engine = createLongVideoEngine({ dataDir: dir });
    const project = await engine.create({ title: "Sinov", story: "Qahramon safarga chiqadi", durationMinutes: 1 });
    assert.equal(project.scenes.length, 6);
    const updated = await engine.updateScene(project.id, "SCENE-0001", { status: "completed", qualityScore: 92 });
    assert.equal(updated.summary.completedScenes, 1);
    const loaded = await engine.get(project.id);
    assert.equal(loaded.scenes[0].qualityScore, 92);
    assert.equal((await engine.list()).length, 1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
