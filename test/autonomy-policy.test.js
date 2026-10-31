"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const policy = require("../modules/autonomy-policy");

test("safe research and sandbox coding are allowed", () => {
  assert.equal(policy.evaluateAction("research_public_web").decision, "allow");
  assert.equal(policy.evaluateAction("write_code_in_sandbox").decision, "allow");
  assert.equal(policy.evaluateAction("run_tests_in_sandbox").decision, "allow");
});

test("external effects require approval", () => {
  for (const action of ["send_external_message", "deploy_production", "spend_money", "access_private_user_data"]) {
    assert.equal(policy.evaluateAction(action).decision, "approval");
  }
});

test("harmful and safety-disabling actions are blocked", () => {
  assert.equal(policy.evaluateAction("harm_person").decision, "blocked");
  assert.equal(policy.evaluateAction("disable_safety_controls").decision, "blocked");
  assert.equal(policy.evaluateAction("delete_user_data").decision, "blocked");
});

test("unknown actions fail closed and policy describes all three levels", () => {
  assert.equal(policy.evaluateAction("invented_action").decision, "approval");
  assert.equal(policy.policyStatus().blockedActionsCannotBeOverriddenByAgent, true);
  assert.equal(policy.policyStatus().executionEnabled, false);
  assert.equal(policy.policyStatus().autonomyLevels.length, 3);
});
