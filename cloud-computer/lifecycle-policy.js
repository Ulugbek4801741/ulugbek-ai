"use strict";
function addCalendarMonths(date, months) {
  const source = new Date(date);
  if (!Number.isFinite(source.getTime()) || !Number.isInteger(months) || months < 0) throw new TypeError("Valid date and non-negative whole months required.");
  const day = source.getDate(), result = new Date(source);
  result.setDate(1); result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}
function getLifecycle(subscription, now) {
  const current = now ? new Date(now) : new Date();
  if (!subscription || !subscription.missedPaymentAt) return { state:"active", access:"allowed", dataAccess:"allowed", purgeAt:null, exportAllowed:false };
  const missedAt = new Date(subscription.missedPaymentAt);
  if (!Number.isFinite(missedAt.getTime()) || !Number.isFinite(current.getTime())) throw new TypeError("Subscription dates must be valid.");
  const purgeAt = addCalendarMonths(missedAt, 6);
  if (subscription.erasedAt) return { state:subscription.releasedAt ? "released" : "erased", access:"blocked", dataAccess:"erased", purgeAt:purgeAt.toISOString(), exportAllowed:false };
  if (current.getTime() >= purgeAt.getTime()) return { state:"purge_due", access:"blocked", dataAccess:"sealed", purgeAt:purgeAt.toISOString(), exportAllowed:true };
  return { state:"locked", access:"blocked", dataAccess:"sealed", purgeAt:purgeAt.toISOString(), exportAllowed:true };
}
function canReassignStorage(record) {
  return Boolean(record && record.erasedAt && record.erasureVerifiedAt && record.releasedAt && !record.legalHold);
}
function canExecutePurge(record, now) {
  if (!record || record.legalHold || record.erasedAt || record.purgeApproved !== true) return false;
  return getLifecycle(record, now).state === "purge_due";
}
module.exports = { addCalendarMonths, getLifecycle, canReassignStorage, canExecutePurge };
