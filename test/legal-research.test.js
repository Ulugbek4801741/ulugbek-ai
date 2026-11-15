"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const legal=require("../modules/legal-research");

test("recognizes Uzbek, English and Russian legal questions",()=>{
 assert.equal(legal.isLegalQuestion("O‘zbekistonda mehnat qonuni qanday?"),true);
 assert.equal(legal.isLegalQuestion("What does this contract mean?"),true);
 assert.equal(legal.isLegalQuestion("Какие действуют налоги?"),true);
 assert.equal(legal.isLegalQuestion("Bugun ob-havo qanday?"),false);
});
test("requires an explicit supported jurisdiction for legal advice",()=>{
 assert.equal(legal.classifyRequest("Mehnat qonuni bo‘yicha savolim bor").needsJurisdiction,true);
 assert.equal(legal.classifyRequest("Mehnat qonuni bo‘yicha savolim bor","UZ").jurisdiction,"O‘zbekiston");
 assert.equal(legal.normalizeCountryCode("ZZ"),"");
});
test("restricts legal evidence to the selected country's official domains",()=>{
 assert.equal(legal.isOfficialSource("https://lex.uz/docs/123","UZ"),true);
 assert.equal(legal.isOfficialSource("https://www.gov.uz/oz","UZ"),true);
 assert.equal(legal.isOfficialSource("https://example.com/law","UZ"),false);
 assert.equal(legal.isOfficialSource("https://legislation.gov.uk/id","UZ"),false);
});
test("builds a jurisdiction-specific official search query",()=>{
 const q=legal.buildOfficialQuery("mehnat shartnomasi","UZ");
 assert.match(q,/site:lex\.uz/);
 assert.match(q,/site:gov\.uz/);
});
test("flags potentially illegal assistance and high-impact actions",()=>{
 assert.equal(legal.classifyRequest("Soxta pasport tayyorlash").potentiallyIllegal,true);
 assert.equal(legal.classifyRequest("Shartnomani imzolab yubor").requiresHumanConfirmation,true);
});
