"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const gate = require("../modules/workflow-gate");

test("empty and oversized tasks are rejected", () => {
  assert.throws(() => gate.createWorkflow("   "), /bo‘sh/);
  assert.throws(() => gate.createWorkflow("x".repeat(4001)), /4000/);
});

test("high-impact actions require human approval and never execute directly", () => {
  const workflow = gate.createWorkflow("Send the report", { action: "send_message" });
  assert.equal(workflow.requiresHumanApproval, true);
  assert.equal(workflow.executionAllowed, false);
});

test("three stages must pass in order before approval", () => {
  const workflow = gate.createWorkflow("Summarize public documentation");
  assert.throws(() => gate.recordStageResult(workflow, "sandbox_tests", true, "test"), /Oldingi/);
  gate.recordStageResult(workflow, "static_safety", true, "static checks passed");
  gate.recordStageResult(workflow, "sandbox_tests", true, "sandbox tests passed");
  gate.recordStageResult(workflow, "independent_review", true, "review passed");
  gate.requestHumanApproval(workflow, "approve");
  assert.equal(workflow.approval, "approved");
  assert.equal(workflow.executionAllowed, false, "approval must not secretly run tools");
});

test("failed stage blocks workflow and later stages", () => {
  const workflow = gate.createWorkflow("Build a prototype");
  gate.recordStageResult(workflow, "static_safety", false, "secret scan failed");
  assert.equal(workflow.status, "blocked");
  assert.throws(() => gate.recordStageResult(workflow, "sandbox_tests", true, "not run"), /Oldingi/);
  assert.throws(() => gate.requestHumanApproval(workflow, "approve"), /uchala/);
});

test("unknown stage and invalid decision are rejected", () => {
  const workflow = gate.createWorkflow("Research");
  assert.throws(() => gate.recordStageResult(workflow, "magic_stage", true), /Noma’lum/);
  assert.throws(() => gate.requestHumanApproval(workflow, "maybe"), /approve yoki reject/);
});