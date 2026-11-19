"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const gate=require("../modules/agent-quality-gate");
test("accepts only structured independent review JSON",()=>{
 const review=gate.parseReview('{"verdict":"pass","confidence":0.92,"issues":[],"checks":["source consistency","task coverage"],"summary":"passed"}');
 assert.equal(review.verdict,"pass");assert.equal(gate.evaluateReview(review).passed,true);
});
test("rejects review with unresolved issues or weak confidence",()=>{
 assert.equal(gate.evaluateReview(gate.parseReview('{"verdict":"pass","confidence":0.6,"issues":[],"checks":["check"]}')).passed,false);
 assert.equal(gate.evaluateReview(gate.parseReview('{"verdict":"pass","confidence":0.95,"issues":["unverified claim"],"checks":["check"]}')).passed,false);
});
test("rejects malformed and non-JSON review output",()=>{
 assert.equal(gate.parseReview("looks good, passed"),null);
 assert.equal(gate.evaluateReview(null).passed,false);
});
test("detects code delivery tasks without blocking conceptual questions",()=>{
 assert.equal(gate.isCodeDeliveryTask("Python API kodini yozib ber"),true);
 assert.equal(gate.isCodeDeliveryTask("Python tilida API nima?"),false);
});
test("review prompt explicitly forbids passing unexecuted code",()=>{
 assert.match(gate.buildReviewPrompt("kod yoz","draft",[]),/test ishga tushirilganini/iu);
});
