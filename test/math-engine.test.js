"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const math = require("../modules/math-engine");

test("basic arithmetic", () => {
  assert.equal(math.calculateExpression("1+1"), 2);
  assert.equal(math.calculateExpression("12 - 5"), 7);
  assert.equal(math.calculateExpression("3*4"), 12);
  assert.equal(math.calculateExpression("8/2"), 4);
});

test("operator precedence, parentheses and powers", () => {
  assert.equal(math.calculateExpression("2+3*4"), 14);
  assert.equal(math.calculateExpression("(2+3)*4"), 20);
  assert.equal(math.calculateExpression("2^3^2"), 512);
});

test("division by zero and invalid input are rejected", () => {
  assert.throws(() => math.calculateExpression("1/0"), /Nolga/);
  assert.throws(() => math.calculateExpression("process.exit()"));
  assert.throws(() => math.calculateExpression("2+"));
});

test("chat question extracts arithmetic before equals sign", () => {
  assert.deepEqual(math.findExpression("1+1= javob nechun bo‘ladi"), {
    expression: "1+1", result: 2
  });
});
