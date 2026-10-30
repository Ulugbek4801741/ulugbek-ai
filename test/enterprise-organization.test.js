"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const organization = require("../agents/enterprise-organization");

test("enterprise organization contains exactly 100 unique agent roles", () => {
  const result = organization.validateOrganization();
  assert.equal(result.valid, true);
  assert.equal(result.total, 100);
  assert.equal(result.chiefManagers, 1);
  assert.equal(result.departmentHeads, 10);
  assert.equal(result.specialists, 89);
  assert.equal(result.uniqueIds, 100);
});

test("all ten departments have a named lead and specialist roles", () => {
  const data = organization.getOrganization();
  assert.equal(data.departments.length, 10);
  for (const department of data.departments) {
    assert.ok(department.head.name);
    assert.ok(department.specialists.length > 0);
  }
});

test("the catalogue does not claim agents are already running", () => {
  assert.equal(organization.getOrganization().activationMode, "catalogue_only");
});
