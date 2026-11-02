"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const catalog = require("../modules/catalog");
const gate = require("../modules/workflow-gate");

test("module catalogue has unique IDs and honest status values", () => {
  const modules = catalog.listModules();
  assert.ok(modules.length >= 10);
  assert.equal(new Set(modules.map((item) => item.id)).size, modules.length);
  for (const item of modules) {
    assert.ok(item.id && item.name && item.purpose);
    assert.ok(["prototype", "planned", "implemented"].includes(item.status));
    assert.ok(Array.isArray(item.capabilities));
  }
  assert.equal(modules.find((item) => item.id === "phone-agent").status, "planned");
});

test("catalog returns defensive copies", () => {
  const first = catalog.listModules();
  first[0].capabilities.push("test-mutation");
  const second = catalog.listModules();
  assert.equal(second[0].capabilities.includes("test-mutation"), false);
});

test("high-impact action names always require approval", () => {
  for (const action of ["send_message", "publish", "delete_file", "external_upload", "purchase", "payment", "trade", "deploy", "change_permissions", "medical_decision", "surgical_action"]) {
    const workflow = gate.createWorkflow("do the requested task", { action });
    assert.equal(workflow.requiresHumanApproval, true, action);
    assert.equal(workflow.executionAllowed, false, action);
  }
});

test("external effects require approval even when task text looks harmless", () => {
  const workflow = gate.createWorkflow("Prepare a summary", { externalEffect: true });
  assert.equal(workflow.requiresHumanApproval, true);
  assert.equal(workflow.executionAllowed, false);
});

test("workflow stage failures are fail-closed", () => {
  const workflow = gate.createWorkflow("Review a document");
  gate.recordStageResult(workflow, "static_safety", false, "negative test");
  assert.equal(workflow.executionAllowed, false);
  assert.throws(() => gate.recordStageResult(workflow, "sandbox_tests", true), /Oldingi/);
  assert.throws(() => gate.requestHumanApproval(workflow, "approve"), /uchala/);
});

test("approval never enables unconfigured external execution", () => {
  const workflow = gate.createWorkflow("Read public documentation");
  for (const stage of gate.REQUIRED_STAGES) gate.recordStageResult(workflow, stage, true, "automated test evidence");
  gate.requestHumanApproval(workflow, "approve");
  assert.equal(workflow.approval, "approved");
  assert.equal(workflow.executionAllowed, false);
  assert.equal(gate.getWorkflowPolicy().failClosed, true);
});
