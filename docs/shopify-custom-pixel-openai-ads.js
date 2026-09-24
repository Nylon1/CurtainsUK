// CurtainsUK — Shopify Custom Pixel bridge for OpenAI Ads checkout events.
// Shopify Admin > Settings > Customer events > OpenAI Ads Checkout
// Privacy: Permission required; data collected does not qualify as data sale.

const OPENAI_PIXEL_ID = "6LN4GfrhY92CkQR6Uti2NH";
const OPENAI_IMAGE_ENDPOINT = "https://bzr.openai.com/v1/sdk/events";

async function getOppref() {
  try {
    return (await browser.cookie.get("__oppref")) || "";
  } catch (_) {
    return "";
  }
}

function eventId(eventName, event) {
  const source = String(event?.id || "")
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .slice(0, 120);
  return source ? `cuk_${eventName}_${source}` : "";
}

async function sendOpenAiEvent(eventName, event) {
  try {
    const params = new URLSearchParams({
      pid: OPENAI_PIXEL_ID,
      event: eventName,
      "data[type]": "contents",
    });

    const id = eventId(eventName, event);
    if (id) params.set("event_id", id);

    const oppref = await getOppref();
    if (oppref) params.set("oppref", oppref);

    const total = event?.data?.checkout?.totalPrice;
    const amount = Number(total?.amount);
    if (
      total?.currencyCode === "GBP" &&
      Number.isFinite(amount) &&
      amount >= 0
    ) {
      params.set("data[amount]", String(Math.round(amount * 100)));
      params.set("data[currency]", "GBP");
    }

    // OpenAI's supported image-tag transport avoids CORS dependency inside
    // Shopify's sandbox. No response body is required.
    const beacon = new Image(1, 1);
    beacon.width = 1;
    beacon.height = 1;
    beacon.style.display = "none";
    beacon.src = `${OPENAI_IMAGE_ENDPOINT}?${params.toString()}`;
  } catch (_) {
    // Measurement must never interrupt checkout.
  }
}

analytics.subscribe("checkout_started", (event) => {
  sendOpenAiEvent("checkout_started", event);
});

analytics.subscribe("checkout_completed", (event) => {
  sendOpenAiEvent("order_created", event);
});
