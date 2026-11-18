"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const vm = require("node:vm");
const path = require("node:path");

async function harness() {
  const source = await fs.readFile(path.join(__dirname, "../public/admin-chat-access.js"), "utf8");
  const listeners = {};
  const form = { addEventListener(type, fn) { listeners[type] = fn; } };
  const message = { value: "", style: {} };
  const calls = [];
  const redirects = [];
  const document = {
    getElementById(id) { return id === "chat-form" ? form : id === "message" ? message : null; },
    addEventListener(type, fn) { listeners["document:" + type] = fn; }
  };
  const fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => ({ ok: true }) };
  };
  const window = { location: { replace(url) { redirects.push(url); } } };
  vm.runInNewContext(source, { document, window, fetch });
  return {
    calls, redirects, message,
    async submit(value) {
      message.value = value;
      let prevented = false;
      let stopped = false;
      listeners.submit({
        preventDefault() { prevented = true; },
        stopImmediatePropagation() { stopped = true; }
      });
      assert.equal(prevented, true);
      assert.equal(stopped, true);
      assert.equal(message.value, "");
      await new Promise(resolve => setImmediate(resolve));
    }
  };
}

test("admin command and first four repeated codes never enter chat or call login", async () => {
  const h = await harness();
  await h.submit("/admin");
  for (let i = 0; i < 4; i += 1) await h.submit("private-code-that-is-never-logged");
  assert.equal(h.calls.length, 0);
  assert.equal(h.redirects.length, 0);
});

test("the fifth identical code makes one login request and redirects on success", async () => {
  const h = await harness();
  await h.submit("/admin");
  for (let i = 0; i < 5; i += 1) await h.submit("private-code-that-is-never-logged");
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].url, "/api/admin/login");
  assert.equal(JSON.parse(h.calls[0].options.body).code, "private-code-that-is-never-logged");
  assert.deepEqual(h.redirects, ["./admin.html"]);
});

test("a changed code restarts the five-entry sequence", async () => {
  const h = await harness();
  await h.submit("/admin");
  await h.submit("first-code");
  await h.submit("first-code");
  await h.submit("different-code");
  await h.submit("different-code");
  await h.submit("different-code");
  await h.submit("different-code");
  assert.equal(h.calls.length, 0);
  await h.submit("different-code");
  assert.equal(h.calls.length, 1);
});
