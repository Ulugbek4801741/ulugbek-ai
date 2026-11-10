"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { createApp } = require("../src/app");

async function withServer(app, run) {
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try { await run(`http://127.0.0.1:${port}`); }
  finally { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

function fakeDb() {
  const tasks = [];
  const agents = new Map();
  return {
    tasks,
    query: async (sql, params = []) => {
      if (sql.includes("INSERT INTO user_agents")) {
        const id = params[0];
        if (!agents.has(id)) agents.set(id, { id: "agent-" + id, user_id: id, status: "active", permissions: {} });
        return { rows: [agents.get(id)] };
      }
      if (sql.includes("INSERT INTO agent_tasks")) {
        const [agent_id, user_id, task_type, description, status, requires_approval] = params;
        const task = { id: "task-" + (tasks.length + 1), agent_id, user_id, task_type, description, status, requires_approval };
        tasks.push(task);
        return { rows: [task] };
      }
      if (sql.includes("FROM agent_tasks WHERE user_id")) {
        return { rows: tasks.filter(t => t.user_id === params[0]) };
      }
      if (sql.includes("UPDATE agent_tasks")) {
        const t = tasks.find(t => t.id === params[1] && t.user_id === params[2] && ["awaiting_approval", "pending"].includes(t.status));
        if (!t) return { rows: [] };
        t.status = params[0];
        return { rows: [{ id: t.id, status: t.status, requires_approval: t.requires_approval }] };
      }
      if (sql.includes("UPDATE user_agents")) {
        const agent = [...agents.values()].find(a => a.id === params[1] && a.user_id === params[2]);
        if (!agent) return { rows: [] };
        agent.status = params[0];
        return { rows: [agent] };
      }
      if (sql.includes("INSERT INTO agent_audit_events")) return { rows: [] };
      if (sql.includes("FROM platform_agent_state")) return { rows: [{ name: "ULUGBEK AI Central Agent", status: "active" }] };
      throw new Error("Unexpected SQL in test: " + sql);
    }
  };
}

test("agent endpoints fail closed if authentication is not configured", async () => {
  const app = createApp({ db: fakeDb(), redis: { ping: async () => "PONG" } });
  await withServer(app, async base => {
    const response = await fetch(base + "/api/agents/me");
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "authentication_not_configured" });
  });
});

test("personal agent is created only through authenticated identity", async () => {
  const db = fakeDb();
  const app = createApp({ db, redis: { ping: async () => "PONG" }, authenticate: (req, _res, next) => { req.user = { id: "user-a", role: "user" }; next(); } });
  await withServer(app, async base => {
    const response = await fetch(base + "/api/agents/me");
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.agent.user_id, "user-a");
  });
});

test("sensitive tasks await approval and are not executed by this API", async () => {
  const db = fakeDb();
  const app = createApp({ db, redis: { ping: async () => "PONG" }, authenticate: (req, _res, next) => { req.user = { id: "user-a", role: "user" }; next(); } });
  await withServer(app, async base => {
    const response = await fetch(base + "/api/agents/me/tasks", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "cloud_pc_control", description: "Open my Windows app" })
    });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.task.status, "awaiting_approval");
    assert.equal(body.execution, "not_started");
  });
});

test("one user cannot read or decide another user's task", async () => {
  const db = fakeDb();
  const appA = createApp({ db, redis: { ping: async () => "PONG" }, authenticate: (req, _res, next) => { req.user = { id: "user-a", role: "user" }; next(); } });
  const appB = createApp({ db, redis: { ping: async () => "PONG" }, authenticate: (req, _res, next) => { req.user = { id: "user-b", role: "user" }; next(); } });
  await withServer(appA, async baseA => {
    const created = await fetch(baseA + "/api/agents/me/tasks", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "general", description: "Help me plan a project" })
    });
    const task = (await created.json()).task;
    await withServer(appB, async baseB => {
      const list = await (await fetch(baseB + "/api/agents/me/tasks")).json();
      assert.equal(list.tasks.length, 0);
      const decision = await fetch(baseB + "/api/agents/me/tasks/" + task.id + "/decision", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision: "approve" })
      });
      assert.equal(decision.status, 404);
    });
  });
});

test("central agent status is restricted to platform admins", async () => {
  const app = createApp({ db: fakeDb(), redis: { ping: async () => "PONG" }, authenticate: (req, _res, next) => { req.user = { id: "user-a", role: "user" }; next(); } });
  await withServer(app, async base => {
    const response = await fetch(base + "/api/agents/platform/status");
    assert.equal(response.status, 403);
  });
});
