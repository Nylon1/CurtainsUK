// CurtainsUK — Shopify Custom Pixel bridge for OpenAI Ads checkout events.
// Install in Shopify Admin > Settings > Customer events > Add custom pixel.
// Privacy settings in Shopify should require Analytics + Marketing consent.

const OPENAI_PIXEL_ID = "6LN4GfrhY92CkQR6Uti2NH";
const OPENAI_EVENT_ENDPOINT = "https://bzr.openai.com/v1/sdk/events";

async function openAiOppref() {
  try {
    return (await browser.cookie.get("__oppref")) || "";
  } catch (_) {
    return "";
  }
}

function safeEventId(eventName, event) {
  const sourceId = String(event?.id || "").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 120);
  return sourceId ? `cuk_${eventName}_${sourceId}` : "";
}

async function sendOpenAiCommerceEvent(eventName, event) {
  try {
    const params = new URLSearchParams();
    params.set("pid", OPENAI_PIXEL_ID);
    params.set("event", eventName);
    params.set("data[type]", "contents");

    const eventId = safeEventId(eventName, event);
    if (eventId) params.set("event_id", eventId);

    const oppref = await openAiOppref();
    if (oppref) params.set("oppref", oppref);

    // CurtainsUK currently transacts in GBP. Send value only when Shopify
    // confirms a GBP checkout total; otherwise omit value rather than guess.
    const total = event?.data?.checkout?.totalPrice;
    const amount = Number(total?.amount);
    if (total?.currencyCode === "GBP" && Number.isFinite(amount) && amount >= 0) {
      params.set("data[amount]", String(Math.round(amount * 100)));
      params.set("data[currency]", "GBP");
    }

    // The OpenAI browser endpoint is intentionally public and requires no secret.
    // no-cors is used because the response body is not needed by this sandbox.
    await fetch(`${OPENAI_EVENT_ENDPOINT}?${params.toString()}`, {
      method: "GET",
      mode: "no-cors",
      keepalive: true,
    });
  } catch (_) {
    // Measurement must never interrupt Shopify checkout.
  }
}

analytics.subscribe("checkout_started", (event) => {
  sendOpenAiCommerceEvent("checkout_started", event);
});

analytics.subscribe("checkout_completed", (event) => {
  sendOpenAiCommerceEvent("order_created", event);
});
