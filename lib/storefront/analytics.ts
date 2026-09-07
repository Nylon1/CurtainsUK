export type StorefrontEventName =
  | "window_type_selected"
  | "configurator_started"
  | "measurement_completion"
  | "configurator_step_completed"
  | "validation_failure"
  | "fabric_selected"
  | "sample_intent"
  | "sample_ordered_intended"
  | "review_submitted"
  | "quote_review_submitted"
  | "price_displayed"
  | "review_approved"
  | "quote_accepted"
  | "checkout_handoff_reached"
  | "checkout_started";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackStorefrontEvent(event: StorefrontEventName, detail: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const payload = { event, storefront: "curtainsuk_phase_3_staging", ...detail };
  window.dataLayer?.push(payload);
  window.dispatchEvent(new CustomEvent("curtainsuk:analytics", { detail: payload }));
}
