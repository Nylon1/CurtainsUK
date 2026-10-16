const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const money = (amount) => new Intl.NumberFormat("en-GB", {
  style: "currency", currency: "GBP",
}).format(amount / 100);
const validMoney = (amount) => Number.isSafeInteger(amount) && amount >= 0;

/** Release permission and the selected quote's eligibility are separate gates. */
export function quoteReviewState(quote, purchaseEnabled) {
  const priced = quote?.ready === true && validMoney(quote.totalMinor);
  return {
    priced,
    canBuy: priced && purchaseEnabled === true && quote.purchaseReady === true,
  };
}

/** Uses the chosen quote's allocations, never standalone prices added into a set. */
export function cushionReviewMarkup({ pieces, quote, purchaseEnabled, scope }) {
  const { priced, canBuy } = quoteReviewState(quote, purchaseEnabled);
  const lines = pieces.map((piece) => {
    const item = quote?.items?.find((candidate) => candidate.specId === piece.id);
    const quantity = piece.quantity ?? 1;
    const amount = priced && validMoney(item?.goodsGrossMinor)
      ? `${money(item.goodsGrossMinor)}${scope === "set" ? " within this set" : ""}`
      : "Price awaiting confirmation";
    return `<article class="review-piece"><strong>Cushion ${escape(piece.number)} · ${escape(piece.size)}</strong><p>${escape(piece.fabric)}<br>${escape(piece.finish)} · ${escape(piece.filling)}<br>${escape(piece.placement)}</p><p class="review-piece-price">${quantity > 1 ? `Quantity ${escape(quantity)} · ` : ""}${escape(amount)}</p></article>`;
  }).join("");
  const dispatch = quote?.dispatchEstimate?.message || quote?.dispatchMessage ||
    "Cushion dispatch estimate awaiting confirmation. Ordering will be available once this and the other required details are confirmed.";
  const delivery = validMoney(quote?.deliveryGrossMinor)
    ? `<p>Cushion-only delivery: ${money(quote.deliveryGrossMinor)}, once per order${priced ? "." : ". Goods price still requires review; this is not a complete quote."}</p>`
    : "";
  const total = priced
    ? `<p class="review-total"><span>Total${validMoney(quote.deliveryGrossMinor) ? " with delivery" : ""}</span><strong>${money(quote.totalMinor)}</strong></p><p>Price, fabric availability and your saved specification will be checked again before checkout.</p>`
    : "";
  return lines + `<p>${escape(dispatch)}</p>` + delivery + total + (canBuy ? "" :
    "<p>Ordering is not yet enabled for this configuration. You can add it to Design My Home while the remaining details are confirmed.</p>");
}
