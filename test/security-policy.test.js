const test = require("node:test");
const assert = require("node:assert/strict");
const { getSecurityPolicy, POLICY_VERSION } = require("../modules/security-policy");

test("security policy exposes versioned, non-empty rules", () => {
  const policy = getSecurityPolicy();
  assert.equal(policy.version, POLICY_VERSION);
  assert.ok(policy.rules.length >= 8);
  assert.equal(policy.executionEnabled, false);
});

test("critical rules cover human approval, unauthorized access and autonomous finance", () => {
  const policy = getSecurityPolicy();
  const critical = policy.rules.filter((rule) => rule.severity === "critical").map((rule) => rule.id);
  assert.ok(critical.includes("human-approval"));
  assert.ok(critical.includes("no-unauthorized-access"));
  assert.ok(critical.includes("no-autonomous-finance"));
  assert.ok(critical.includes("malware-safety"));
});

test("policy does not falsely claim to enforce every agent action", () => {
  const policy = getSecurityPolicy();
  assert.equal(policy.enforcement, "policy-disclosure-only");
  assert.match(policy.note, /alohida enforcement va testga muhtoj/);
});
