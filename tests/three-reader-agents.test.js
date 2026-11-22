"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const agents=require("../modules/three-reader-agents");
test("rejects non-public GitHub repository input",async()=>{await assert.rejects(()=>agents.githubReader("https://evil.example/a/b"),/GitHub public repository format/);});
test("ZIP reader rejects invalid archive header",()=>{assert.throws(()=>agents.zipReader(Buffer.from("not zip")),/ZIP fayl/);});
test("ZIP reader enforces archive size",()=>{const b=Buffer.alloc(agents.limits.zipBytes+1);b[0]=0x50;b[1]=0x4b;assert.throws(()=>agents.zipReader(b),/ZIP fayl/);});
