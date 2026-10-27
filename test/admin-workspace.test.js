"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const tempDir = path.join(os.tmpdir(), "ulugbek-admin-workspace-" + process.pid);
process.env.ADMIN_WORKSPACE_STORE_PATH = path.join(tempDir, "workspace.json");
const workspace = require("../modules/admin-workspace");

test("service proposals require meaningful prompts and need approval", async () => {
  await assert.rejects(() => workspace.createService({ prompt: "short" }, "admin@example.com"), { status: 400 });
  const created = await workspace.createService({
    title: "Logistika",
    prompt: "Logistika buyurtma va yetkazib berish xizmatini loyihala",
    platforms: ["web", "android", "unsupported"]
  }, "admin@example.com");
  assert.equal(created.approvalStatus, "pending");
  assert.deepEqual(created.platforms, ["web", "android"]);
  const pending = await workspace.listServices();
  assert.ok(pending.some(item => item.id === created.id));
  const approved = await workspace.reviewService(created.id, "approved", "Testdan keyin qurish mumkin");
  assert.equal(approved.approvalStatus, "approved");
  assert.equal(approved.status, "approved_for_build");
  assert.equal(await workspace.reviewService("missing-id", "approved", ""), null);
});

test("company contract intake validates details and approval is not a signed contract", async () => {
  await assert.rejects(() => workspace.createContract({ company: "X", contactName: "", email: "bad", description: "short" }), { status: 400 });
  const created = await workspace.createContract({
    company: "Example Logistics Ltd",
    contactName: "Test Contact",
    email: "contact@example.com",
    phone: "+998 90 000 00 00",
    description: "We would like to discuss a custom logistics tracking service."
  });
  assert.equal(created.status, "pending_review");
  const all = await workspace.listContracts();
  assert.ok(all.some(item => item.id === created.id));
  const reviewed = await workspace.reviewContract(created.id, "approved_for_negotiation", "Muzokara uchun ko‘rib chiqilsin");
  assert.equal(reviewed.status, "approved_for_negotiation");
  assert.equal(await workspace.reviewContract("missing-id", "rejected", ""), null);
});

test("invalid review decisions are rejected", async () => {
  await assert.rejects(() => workspace.reviewService("x", "publish_now", ""), { status: 400 });
  await assert.rejects(() => workspace.reviewContract("x", "sign_contract", ""), { status: 400 });
});

test.after(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});
