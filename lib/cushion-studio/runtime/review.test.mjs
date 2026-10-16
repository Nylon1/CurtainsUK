import test from "node:test";
import assert from "node:assert/strict";
import { cushionReviewMarkup, quoteReviewState } from "./review.mjs";

const pieces = [
  { id: "square", number: 1, size: "50 × 50 cm", fabric: "Plain · Green", finish: "Unpiped", filling: "Cover only", quantity: 1, placement: "Matching upright faces" },
  { id: "rectangle", number: 2, size: "30 × 45 cm", fabric: "Stripe · Stone", finish: "Unpiped", filling: "Cover only", quantity: 2, placement: "Matching upright faces" },
];
const quote = {
  ready: true, purchaseReady: true, totalMinor: 10496, deliveryGrossMinor: 495,
  dispatchEstimate: { message: "Estimated cushion dispatch: 3-4 calendar weeks after order confirmation." },
  // Deliberately reverse order to verify identity-based allocation.
  items: [{ specId: "rectangle", quantity: 2, goodsGrossMinor: 6667 }, { specId: "square", quantity: 1, goodsGrossMinor: 3334 }],
};

test("set review displays identity-matched allocations, quantity and exact total while release is off", () => {
  const html = cushionReviewMarkup({ pieces, quote, purchaseEnabled: false, scope: "set" });
  assert.doesNotMatch(html, /VAT/);
  assert.match(html, /Cushion 1[\s\S]*£33\.34 within this set<\/p>/);
  assert.match(html, /Cushion 2[\s\S]*Quantity 2 · £66\.67 within this set/);
  assert.match(html, /Total with delivery[\s\S]*£104\.96/);
  assert.equal((html.match(/£4\.95/g) || []).length, 1);
  assert.match(html, /3-4 calendar weeks/);
  assert.match(html, /Ordering is not yet enabled/);
  assert.deepEqual(quoteReviewState(quote, false), { priced: true, canBuy: false });
});

test("individual review uses standalone price while set allocation can differ", () => {
  const individual = { ...quote, totalMinor: 5495, items: [{ specId: "square", quantity: 1, goodsGrossMinor: 5000 }] };
  const html = cushionReviewMarkup({ pieces: [pieces[0]], quote: individual, purchaseEnabled: true, scope: "piece" });
  assert.match(html, /£50\.00/);
  assert.match(html, /£54\.95/);
  assert.doesNotMatch(html, /within this set|£33\.34|Cushion 2|Ordering is not yet enabled/);
  assert.equal(quoteReviewState(individual, true).canBuy, true);
});

test("unready set cannot hide an independently ready individual and missing dispatch still blocks buying", () => {
  const blocked = { ...quote, ready: false, purchaseReady: false, totalMinor: null };
  assert.deepEqual(quoteReviewState(blocked, true), { priced: false, canBuy: false });
  assert.deepEqual(quoteReviewState(quote, true), { priced: true, canBuy: true });
  const noDispatch = { ...quote, purchaseReady: false, dispatchEstimate: null };
  const html = cushionReviewMarkup({ pieces, quote: noDispatch, purchaseEnabled: true, scope: "set" });
  assert.match(html, /£104\.96/);
  assert.match(html, /dispatch estimate awaiting confirmation/);
  assert.match(html, /Ordering is not yet enabled/);
  assert.equal(quoteReviewState(noDispatch, true).canBuy, false);
  assert.equal(quoteReviewState({ ...quote, purchaseReady: undefined }, true).canBuy, false);
});

test("incomplete prices never display stale item allocations or a false complete quote", () => {
  const html = cushionReviewMarkup({ pieces, quote: { ...quote, ready: false }, purchaseEnabled: true, scope: "set" });
  assert.equal((html.match(/Price awaiting confirmation/g) || []).length, 2);
  assert.doesNotMatch(html, /£33\.34|£66\.67|£104\.96|Total including/);
  assert.match(html, /not a complete quote/);
  for (const totalMinor of [null, undefined, NaN, Infinity, -1, 10.5]) {
    assert.equal(quoteReviewState({ ...quote, totalMinor }, true).canBuy, false);
  }
});

test("review escapes fabric, placement and dispatch text", () => {
  const html = cushionReviewMarkup({ pieces: [{ ...pieces[0], fabric: '<img src=x onerror="bad">', placement: '<script>bad</script>' }], quote: { ...quote, dispatchEstimate: { message: '<script>bad</script>' } }, scope: "piece", purchaseEnabled: false });
  assert.doesNotMatch(html, /<script>|<img/);
  assert.match(html, /&lt;img/);
});
