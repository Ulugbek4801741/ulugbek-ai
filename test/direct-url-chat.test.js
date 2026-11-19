"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");

test("chat reads a pasted public URL through the shared safe page reader", () => {
  assert.match(server, /conversationMessage\.match\(\/https\?:/);
  assert.match(server, /publicWebReader\.readPublicPage\(directUrl\)/);
  assert.match(server, /direct-public-page-(?:ai|native)-research/);
  assert.match(server, /pageRead: true/);
});

test("direct website reading returns source links and discloses blocked pages", () => {
  assert.match(server, /sources: \[\{ title: page\.title, url: page\.source, pageRead: true \}\]/);
  assert.match(server, /direct-public-page-read-failed/);
  assert.match(server, /robots\.txt taqiqi/);
});
