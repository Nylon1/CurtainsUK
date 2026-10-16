import test from "node:test";
import assert from "node:assert/strict";
import {
  OWNER_CONFIRMED_CUSHION_DISPATCH,
  OWNER_CONFIRMED_CURTAIN_DISPATCH,
  confirmedCushionDispatch,
  customerCushionDispatch,
  type CushionWorkingDayDispatchEstimate,
} from "../dispatch";

const workingDays: CushionWorkingDayDispatchEstimate = {
  version: "synthetic-working-days-v1",
  status: "confirmed",
  minimumWorkingDays: 10,
  maximumWorkingDays: 15,
  startsFrom: "fabric-availability-confirmation",
  confirmedAt: "2026-10-14T12:00:00Z",
  approvalReference: "synthetic test authority",
};

test("owner default is exactly 3–4 calendar weeks from order confirmation with date-only provenance", () => {
  const parsed = confirmedCushionDispatch(OWNER_CONFIRMED_CUSHION_DISPATCH);
  assert.deepEqual(parsed, OWNER_CONFIRMED_CUSHION_DISPATCH);
  assert.notEqual(parsed, OWNER_CONFIRMED_CUSHION_DISPATCH);
  assert.ok(Object.isFrozen(OWNER_CONFIRMED_CUSHION_DISPATCH));
  assert.equal(parsed?.unit, "calendar-weeks");
  assert.equal(parsed?.minimumCalendarWeeks, 3);
  assert.equal(parsed?.maximumCalendarWeeks, 4);
  assert.equal(parsed?.startsFrom, "order-confirmation");
  assert.equal(parsed?.confirmedAt, "2026-10-15");
  const customer = customerCushionDispatch(parsed)!;
  assert.match(customer.message, /3-4 calendar weeks after order confirmation/);
  assert.match(customer.message, /dispatch estimate, not a guaranteed delivery date/);
  assert.equal("minimumWorkingDays" in customer, false);
  assert.equal("approvalReference" in customer, false);
  assert.equal("confirmedAt" in customer, false);
});

test("owner curtain dispatch is four to five calendar weeks from the order point", () => {
  const curtain = confirmedCushionDispatch(OWNER_CONFIRMED_CURTAIN_DISPATCH);
  assert.deepEqual(curtain, OWNER_CONFIRMED_CURTAIN_DISPATCH);
  assert.equal(curtain?.minimumCalendarWeeks, 4);
  assert.equal(curtain?.maximumCalendarWeeks, 5);
  assert.equal(curtain?.startsFrom, "order-confirmation");
});

test("legacy working-day contracts and customer projection remain backwards compatible", () => {
  assert.deepEqual(confirmedCushionDispatch(workingDays), workingDays);
  assert.deepEqual(customerCushionDispatch(workingDays), {
    version: workingDays.version,
    minimumWorkingDays: 10,
    maximumWorkingDays: 15,
    startsFrom: "fabric-availability-confirmation",
    message: "Estimated cushion dispatch: 10-15 working days after confirmation that the fabric is available. This is a dispatch estimate, not a guaranteed delivery date.",
  });
  assert.deepEqual(confirmedCushionDispatch({ ...workingDays, unit: "working-days" }), {
    ...workingDays, unit: "working-days",
  });
});

test("missing, mixed, incomplete, unknown and malformed dispatch rules fail closed", () => {
  const weeks = OWNER_CONFIRMED_CUSHION_DISPATCH;
  const { unit: _unit, ...withoutUnit } = weeks;
  for (const invalid of [
    null, undefined, {}, [], withoutUnit,
    { ...weeks, unit: "weeks" },
    { ...weeks, unit: "working-days" },
    { ...weeks, minimumWorkingDays: 15 },
    { ...weeks, maximumWorkingDays: undefined },
    { ...workingDays, minimumCalendarWeeks: 3 },
    { ...workingDays, maximumCalendarWeeks: undefined },
    { ...weeks, deliveryGuaranteed: true },
    { ...weeks, minimumCalendarWeeks: "3" },
    { ...weeks, maximumCalendarWeeks: 3.5 },
    { ...weeks, minimumCalendarWeeks: -1 },
    { ...weeks, maximumCalendarWeeks: 2 },
    { ...weeks, maximumCalendarWeeks: 521 },
    { ...weeks, status: "proposed" },
    { ...weeks, approvalReference: " " },
    { ...weeks, approvalReference: 123 },
    { ...weeks, version: "" },
    { ...weeks, startsFrom: "order-delivery" },
    { ...weeks, confirmedAt: "2026-02-30" },
    { ...weeks, confirmedAt: "2026-10-15T12:00:00" },
  ]) {
    assert.equal(confirmedCushionDispatch(invalid), null, JSON.stringify(invalid));
    assert.equal(customerCushionDispatch(invalid), null);
  }
});

test("parsed dispatch is detached from mutable server input and never silently converts weeks to days", () => {
  const rule = { ...OWNER_CONFIRMED_CUSHION_DISPATCH };
  const parsed = confirmedCushionDispatch(rule)!;
  rule.maximumCalendarWeeks = 8;
  assert.equal(parsed.maximumCalendarWeeks, 4);
  assert.equal("maximumWorkingDays" in parsed, false);
  assert.match(customerCushionDispatch({ ...rule, minimumCalendarWeeks: 1, maximumCalendarWeeks: 1 })!.message, /1 calendar week after/);
});
