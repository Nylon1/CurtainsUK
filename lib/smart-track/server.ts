import "server-only";
import { randomUUID } from "node:crypto";
import { authenticateShopifyAppProxy } from "../storefront/security/shopify-app-proxy";
import { endpointRateLimitResponse } from "../storefront/security/endpoint-rate-limit";
import { boundedCushionBody } from "../cushion-studio/server";
import { houseCheckoutServices } from "../storefront/rooms-server";
import { fabricMasterRecordsByIds } from "../fabric-master/repository";
import { linkedCurtainEvidence } from "./linked";
import { quoteSmartTrack } from "./pricing";
import { parseSmartTrackSpec, UUID } from "./domain";
import { smartTrackAsset } from "./assets";
import type { HouseReviewRequest } from "../storefront/rooms-core";
const headers = {
  "Cache-Control": "no-store, private",
  "X-Robots-Tag": "noindex,nofollow",
};
export const smartTrackEnabled = () =>
  process.env.CURTAINSUK_SMART_TRACK_ENABLED === "true";
export const smartTrackPurchasesEnabled = () =>
  smartTrackEnabled() &&
  process.env.CURTAINSUK_SMART_TRACK_PURCHASES_ENABLED === "true" &&
  process.env.CURTAINSUK_SMART_TRACK_WEBHOOK_ENABLED === "true" &&
  process.env.CURTAINSUK_PRODUCTION_PURCHASES_APPROVED === "true";
export async function trackFabricWeight(id: string) {
  const record = (await fabricMasterRecordsByIds([id]))[0];
  return record
    ? {
        gsm: record.weight_gsm,
        widthCm:
          record.full_width_mm === null ? null : record.full_width_mm / 10,
      }
    : undefined;
}
export function trackDiagnostic(stage: string, requestId: string = randomUUID()) {
  if (
    ![
      "SCENE",
      "ASSET",
      "CONTROL",
      "CATALOGUE",
      "QUOTE",
      "COMPATIBILITY",
      "SAVE",
      "REVIEW",
      "CHECKOUT",
    ].includes(stage)
  )
    return;
  console.error(
    JSON.stringify({
      event: "CURTAINSUK_SMART_TRACK_FAILURE",
      stage,
      requestId,
      release: "smart-track-v2",
      sourceCommit: process.env.CURTAINSUK_BUILD_SOURCE_COMMIT ?? null,
    }),
  );
}
export async function handleSmartTrack(request: Request, segments: string[]) {
  if (!smartTrackEnabled()) return new Response(null, { status: 404, headers });
  const requestId = randomUUID();
  try {
    await authenticateShopifyAppProxy({
      request,
      operation: "smart-track",
      rateLimit: { limit: 120, windowSeconds: 60 },
    });
    if (segments[0] !== "api")
      return request.method === "GET" && segments.length <= 1
        ? smartTrackAsset(segments[0] ?? "")
        : new Response(null, { status: 404, headers });
    if (request.method !== "POST" || segments.length !== 2)
      return new Response(null, { status: 404, headers });
    if (
      !request.headers.get("content-type")?.startsWith("application/json") ||
      (request.headers.get("origin") &&
        request.headers.get("origin") !== "https://www.curtainsuk.com")
    )
      throw Error("TRACK_INPUT_INVALID");
    const body = await boundedCushionBody(request),
      operation = segments[1];
    if (operation === "diagnostic") {
      trackDiagnostic(
        String(body.stage),
        typeof body.requestId === "string" && UUID.test(body.requestId)
          ? body.requestId
          : requestId,
      );
      return Response.json({ requestId }, { headers });
    }
    if (operation === "quote") {
      const spec = parseSmartTrackSpec(body.spec);
      const linked = spec.linkedCurtain
        ? await linkedCurtainEvidence(
            spec.linkedCurtain.configurationId,
            body.curtains as HouseReviewRequest,
            houseCheckoutServices(),
            trackFabricWeight,
          )
        : undefined;
      return Response.json(
        { quote: quoteSmartTrack(spec, { linked }), purchaseEnabled: smartTrackPurchasesEnabled(), requestId },
        { headers },
      );
    }
    if (operation === "linked" && typeof body.configurationId === "string") {
      const link = await linkedCurtainEvidence(
        body.configurationId,
        body.curtains as HouseReviewRequest,
        houseCheckoutServices(),
        trackFabricWeight,
      );
      if (!link) throw Error("TRACK_LINK_INVALID");
      return Response.json({ link, requestId }, { headers });
    }
    return new Response(null, { status: 404, headers });
  } catch (error) {
    const rate = endpointRateLimitResponse(error);
    if (rate)
      return Response.json(
        { message: rate.message, requestId },
        { status: rate.status, headers: { ...headers, ...rate.headers } },
      );
    trackDiagnostic(
      segments[1] === "linked" ? "COMPATIBILITY" : "QUOTE",
      requestId,
    );
    const code = error instanceof Error ? error.message : "";
    const messages: Record<string, string> = {
      TRACK_LENGTH_INVALID:
        "Enter an exact track length from 100 to 500 cm.",
      TRACK_WEIGHT_CONFIRMATION_INVALID:
        "Confirm the curtain weight recommendation for your selected motor.",
      TRACK_WEIGHT_INVALID:
        "Check the weight-helper values. Use a measured total or leave unknown details blank.",
      TRACK_LINK_INVALID:
        "Choose a saved curtain to link, or configure for existing curtains.",
      TRACK_SPEC_INVALID:
        "Check the track, motor, mounting and heading choices.",
      TRACK_WAVE_SPACING_REQUIRED: "Choose 60 mm or 80 mm wave spacing.",
    };
    return Response.json(
      {
        message:
          messages[code] ??
          "We could not check this selection. Your saved design is unchanged; please retry.",
        requestId,
      },
      { status: 400, headers },
    );
  }
}
