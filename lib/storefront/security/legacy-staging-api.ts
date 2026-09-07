import "server-only";
import { NextResponse } from "next/server";
import { PUBLIC_NO_STORE_HEADERS } from "./http";

/**
 * The pre-proxy staging routes are retained only for the local reference
 * harness. Deployed environments fail closed unless an operator explicitly
 * opts in; Dawn uses the signed first-party app proxy instead.
 */
export function legacyStagingApiDisabledResponse() {
  if (process.env.CURTAINSUK_LEGACY_STAGING_API_ENABLED === "true") return null;
  return NextResponse.json(
    { error: "This staging endpoint has been retired." },
    { status: 410, headers: PUBLIC_NO_STORE_HEADERS },
  );
}
