"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { addCalendarMonths, getLifecycle, canReassignStorage, canExecutePurge } = require("../cloud-computer/lifecycle-policy");
test("six calendar months handle month ends", () => assert.equal(addCalendarMonths("2026-08-31T10:00:00Z",6).toISOString(),"2027-02-28T10:00:00.000Z"));
test("missed payment locks access and seals data", () => {
 const x=getLifecycle({missedPaymentAt:"2026-10-01T00:00:00Z"},"2026-10-02T00:00:00Z");
 assert.equal(x.state,"locked"); assert.equal(x.access,"blocked"); assert.equal(x.dataAccess,"sealed"); assert.equal(x.exportAllowed,true);
});
test("six-month recovery window uses calendar months", () => {
 const s={missedPaymentAt:"2026-04-30T00:00:00Z"};
 assert.equal(getLifecycle(s,"2026-10-29T23:59:59Z").state,"locked");
 assert.equal(getLifecycle(s,"2026-10-30T00:00:00Z").state,"purge_due");
});
test("time alone never authorizes deletion", () => {
 const s={missedPaymentAt:"2026-01-01T00:00:00Z",purgeApproved:false};
 assert.equal(canExecutePurge(s,"2026-07-01T00:00:00Z"),false);
 assert.equal(canExecutePurge({...s,purgeApproved:true},"2026-06-30T00:00:00Z"),false);
 assert.equal(canExecutePurge({...s,purgeApproved:true},"2026-07-01T00:00:00Z"),true);
});
test("legal hold blocks purge and reassignment", () => {
 const s={missedPaymentAt:"2026-01-01T00:00:00Z",purgeApproved:true,legalHold:true};
 assert.equal(canExecutePurge(s,"2026-07-01T00:00:00Z"),false);
 assert.equal(canReassignStorage({erasedAt:"x",erasureVerifiedAt:"x",releasedAt:"x",legalHold:true}),false);
});
test("storage needs verified erasure and release before reassignment", () => {
 assert.equal(canReassignStorage({erasedAt:"x",releasedAt:"x"}),false);
 assert.equal(canReassignStorage({erasedAt:"x",erasureVerifiedAt:"x",releasedAt:"x"}),true);
});
