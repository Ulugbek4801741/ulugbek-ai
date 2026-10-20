const test = require("node:test");
const assert = require("node:assert/strict");

test("starter project includes a basic API test placeholder", () => {
  assert.equal(typeof fetch, "function", "Node.js 20+ fetch support is required");
});
