"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const jobs = require("../modules/job-search");
const memory = require("../modules/conversation-memory");

test("Python developer requests require Python-specific vacancy evidence", () => {
  const role = jobs.extractJobRole("masofaviy Python dasturchi ishlarini top");
  assert.equal(role.label, "Python dasturchi");
  assert.equal(role.evidencePattern.test("Senior React Full-stack Developer"), false);
  assert.equal(role.evidencePattern.test("Python Engineer"), true);
});

test("only explicit monthly pay is extracted as monthly salary", () => {
  assert.equal(jobs.extractSalary("Salary: $1000 per task"), "");
  assert.equal(jobs.extractSalary("$1,000 sign-on bonus"), "");
  assert.equal(jobs.extractSalary("Salary: $500"), "");
  assert.match(jobs.extractSalary("Salary: $4,000 per month"), /\$4,000 per month/i);
});

test("application link is not misreported as phone, email or Telegram contact", () => {
  const item = jobs.extractJobDetails({
    title: "Python Developer",
    snippet: "Remote Python Developer position with requirements and responsibilities.",
    url: "https://example.com/jobs/python",
    officialStatus: "published",
    applicationUrl: "https://example.com/apply"
  }, "Python developer jobs");
  assert.equal(item.contactAvailable, false);
  assert.deepEqual(item.phones, []);
  assert.deepEqual(item.emails, []);
  assert.deepEqual(item.telegram, []);
});

test("job contact follow-up reuses prior results in the same session", () => {
  const session = "job-follow-up-test-session";
  const prompt = "Dunyo bo‘ylab masofaviy Python dasturchi ishlarini top";
  memory.remember(session, prompt);
  memory.rememberJobResults(session, prompt, [{
    title: "Python Engineer", company: "Example Ltd", salary: "",
    phones: [], emails: ["jobs@example.com"], telegram: [],
    url: "https://example.com/jobs/python"
  }]);
  const followUp = "Telefon, Telegram, email va oylik maoshni qisqacha ayt";
  assert.equal(memory.isJobDetailsRequest(followUp), true);
  assert.equal(memory.getLastJobResults(session).length, 1);
  assert.match(memory.expand(session, followUp), /Python dasturchi/);
  const reply = jobs.formatJobContactSummary(memory.getLastJobResults(session));
  assert.match(reply, /jobs@example\.com/);
  assert.match(reply, /Aniq oylik maosh e’londa ko‘rsatilmagan/);
});
