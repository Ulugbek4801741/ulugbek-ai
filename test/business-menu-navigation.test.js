const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "public");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const hub = fs.readFileSync(path.join(root, "business-hub.js"), "utf8");

test("No-code platform is removed from the left navigation", () => {
  assert.doesNotMatch(html, /id="side-builder"/);
  assert.doesNotMatch(app, /\$\("side-builder"\)/);
});

test("No-code platform is available from the top-right business menu", () => {
  assert.match(hub, /data-open="builder"/);
  assert.match(hub, /No-code platforma/);
  assert.match(hub, /builder-modal/);
});

test("business menu keeps the core service categories", () => {
  for (const category of ["Onlayn magazin", "Logistika", "Taksi xizmati", "O‘quv kurslari"]) {
    assert.ok(hub.includes(category), category + " menu entry is missing");
  }
});
