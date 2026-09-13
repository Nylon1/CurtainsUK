import { randomUUID } from "node:crypto";

export type CheckoutBoundary =
  | "REQUEST_VALIDATION"
  | "REVIEW_STATE"
  | "PRICE_AND_STOCK"
  | "PRICE_CONFIRMATION"
  | "FABRIC_IDENTITY"
  | "COMMERCIAL_VERIFICATION"
  | "STOCK_SNAPSHOT"
  | "SHIPPING"
  | "CHECKOUT_GATE"
  | "SNAPSHOT"
  | "HANDOFF_PERSISTENCE"
  | "SHOPIFY_EXECUTION"
  | "EXECUTION_RECEIPT";

/** Request-local diagnostics only; never changes retries, state or the thrown error. */
export async function traceCheckout<T>(
  work: (enter: (boundary: CheckoutBoundary) => void) => Promise<T>,
  report: (event: {
    event: string;
    requestId: string;
    boundary: CheckoutBoundary;
    code: string;
  }) => void,
): Promise<T> {
  let boundary: CheckoutBoundary = "REQUEST_VALIDATION";
  const requestId = randomUUID();
  try {
    return await work((next) => {
      boundary = next;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code =
      /^(?:CHECKOUT|SHOPIFY|STAGING|FABRIC|PRICE|SHIPPING|SUPPLIER|DAILY_STOCK)_[A-Z_]{1,80}$/.test(
        message,
      )
        ? message
        : "UNCLASSIFIED_FAILURE";
    // Logging failure must never replace the original operational failure.
    try {
      report({
        event: "CURTAINSUK_CHECKOUT_FAILED",
        requestId,
        boundary,
        code,
      });
    } catch {
      /* retain original */
    }
    throw error;
  }
}
