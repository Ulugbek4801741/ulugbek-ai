"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const agents=require("../modules/three-reader-agents");
test("rejects non-public GitHub repository input",async()=>{await assert.rejects(()=>agents.githubReader("https://evil.example/a/b"),/GitHub public repository format/);});
test("ZIP reader rejects invalid archive header",async()=>{await assert.rejects(()=>agents.zipReader(Buffer.from("not zip")),/ZIP fayl/);});
test("ZIP reader enforces archive size",async()=>{const b=Buffer.alloc(agents.limits.zipBytes+1);b[0]=0x50;b[1]=0x4b;await assert.rejects(()=>agents.zipReader(b),/ZIP fayl/);});
