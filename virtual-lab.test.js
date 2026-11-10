"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { AGENTS, createVirtualLab } = require("./virtual-lab");

test("virtual lab exposes a specialist roster without claiming real model autonomy", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-lab-"));
  try {
    const lab = createVirtualLab({ storePath: path.join(dir, "state.json") });
    await lab.load();
    assert.equal(AGENTS.length, 8);
    assert.equal(lab.status().mode, "simulation-only");
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test("virtual lab queues and processes safe simulation plans", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-lab-"));
  try {
    const lab = createVirtualLab({ storePath: path.join(dir, "state.json"), now: () => "2026-10-31T00:00:00.000Z" });
    await lab.load();
    await lab.enqueue({ type: "security", title: "Review admin permissions", priority: 5 });
    await lab.enqueue({ type: "benchmark", title: "Create Uzbek benchmark" });
    const result = await lab.runCycle({ maxTasks: 2 });
    assert.equal(result.processed, 2);
    assert.equal(result.reports[0].assignedAgent, "security-auditor");
    assert.equal(result.status.queued, 0);
    assert.equal(result.status.completed, 2);
    assert.match(result.reports[0].limitations[0], /Simulation only/);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test("virtual lab rejects arbitrary commands and unknown task types", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-lab-"));
  try {
    const lab = createVirtualLab({ storePath: path.join(dir, "state.json") });
    await lab.load();
    await assert.rejects(lab.enqueue({ type: "shell", title: "run arbitrary shell" }), /Ruxsat etilmagan/);
    await assert.rejects(lab.enqueue({ type: "engineering", title: "" }), /sarlavhasi/);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test("virtual lab persists its queue and history across reload", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-lab-"));
  try {
    const storePath = path.join(dir, "state.json");
    const first = createVirtualLab({ storePath });
    await first.load();
    await first.enqueue({ type: "research", title: "Study public model cards" });
    await first.runCycle();
    const second = createVirtualLab({ storePath });
    await second.load();
    assert.equal(second.status().cycle, 1);
    assert.equal(second.status().completed, 1);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});


test("worker pool scales above the eight coordinator roles but respects configured limits", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-lab-"));
  try {
    const lab = createVirtualLab({ storePath: path.join(dir, "state.json"), maxWorkers: 3 });
    await lab.load();
    for (let i = 0; i < 12; i++) await lab.enqueue({ type: "benchmark", title: "Benchmark batch " + i });
    const result = await lab.runCycle({ maxTasks: 12, concurrency: 3 });
    assert.equal(result.processed, 12);
    assert.equal(result.concurrency, 3);
    assert.equal(new Set(result.reports.map(report => report.workerId)).size, 3);
    assert.equal(result.status.workerPool.configuredConcurrency, 3);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test("worker pool never exceeds its hard safety cap", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-lab-"));
  try {
    const lab = createVirtualLab({ storePath: path.join(dir, "state.json"), maxWorkers: 1000000000 });
    await lab.load();
    assert.equal(lab.status().workerPool.configuredConcurrency, 64);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});


test("1000-task stress test: queue, routing, bounded workers, and reports remain consistent", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-lab-stress-"));
  try {
    const lab = createVirtualLab({ storePath: path.join(dir, "state.json"), maxWorkers: 16 });
    await lab.load();
    const expectedIds = new Set();
    for (let i = 0; i < 1000; i++) {
      const task = await lab.enqueue({
        type: ["benchmark", "research", "product", "security", "engineering", "device"][i % 6],
        title: "Stress scenario " + i,
        priority: (i % 5) + 1
      });
      assert.ok(task.id);
      assert.equal(task.status, "queued");
      assert.ok(!expectedIds.has(task.id), "task IDs must be unique");
      expectedIds.add(task.id);
    }
    assert.equal(lab.status().queued, 1000);
    const result = await lab.runCycle({ maxTasks: 1000, concurrency: 16 });
    assert.equal(result.processed, 1000);
    assert.equal(result.reports.length, 1000);
    assert.equal(new Set(result.reports.map(report => report.taskId)).size, 1000);
    assert.ok(result.reports.every(report => expectedIds.has(report.taskId)));
    assert.ok(result.reports.every(report => /^worker-(?:[1-9]|1[0-6])$/.test(report.workerId)));
    assert.equal(result.status.queued, 0);
    assert.equal(result.status.completed, 500, "history is intentionally capped at 500");
    assert.ok(result.reports.every(report => report.limitations.some(item => item.includes("Simulation only"))));
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test("1000 malformed task inputs are rejected without entering the queue", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ulugbek-lab-invalid-"));
  try {
    const lab = createVirtualLab({ storePath: path.join(dir, "state.json") });
    await lab.load();
    for (let i = 0; i < 1000; i++) {
      await assert.rejects(
        lab.enqueue({ type: "unapproved-" + i, title: "Invalid task " + i }),
        /Ruxsat etilmagan/
      );
    }
    assert.equal(lab.status().queued, 0);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
