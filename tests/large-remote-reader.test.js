"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const reader = require("../modules/large-remote-reader");
test("remote reader exports limits and function", () => {
 assert.equal(typeof reader.readLargeRepository, "function");
 assert.equal(reader.limits.maxFiles, 30);
});
