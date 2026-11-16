"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const builder=require("../modules/no-code-builder");
test("creates a universal starter project",()=>{
 const result=builder.buildProject({task:"Chat Universal nomli ChatGPTga o‘xshash chat ilova yarat"});
 assert.equal(result.ok,true); assert.equal(result.product.name,"Chat Universal");
 assert.equal(result.product.template,"universal");
 assert.deepEqual(result.files.map(f=>f.path),["index.html","manifest.webmanifest","README.md"]);
 assert.equal(result.verification.apkBuilt,false); assert.match(result.files[0].content,/Chat Universal/);
});
test("selects suitable starter templates",()=>{
 assert.equal(builder.chooseTemplate("Onlayn do‘kon va buyurtma tizimi"),"storefront");
 assert.equal(builder.chooseTemplate("Shaxsiy portfolio sayt"),"portfolio");
 assert.equal(builder.chooseTemplate("Onlayn kurs va dars platformasi"),"course");
});
test("escapes HTML and rejects invalid input",()=>{
 const result=builder.buildProject({task:'<script>alert(1)</script> nomli sayt'});
 assert.doesNotMatch(result.files[0].content,/<script>alert\(1\)<\/script>/);
 assert.throws(()=>builder.buildProject({task:" "}),{statusCode:400});
 assert.throws(()=>builder.buildProject({task:"x".repeat(4001)}),{statusCode:413});
});
