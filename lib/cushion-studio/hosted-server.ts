import "server-only";
import { authenticateShopifyAppProxy } from "../storefront/security/shopify-app-proxy";
import { prepareSampleOrder } from "../storefront/sample-order-server";
import {
  boundedCushionBody,
  cushionCatalogue,
  cushionTrialQuote,
  currentCushionFacts,
  currentCushionRules,
} from "./server";
import { customerCushionQuote } from "./commerce";
import {
  cushionOwnerHash,
  createHostedCushionRepository,
} from "./hosted-repository";
import { parseCushionDesign } from "./domain";
import { cushionPreviewAsset } from "./preview-assets";
import {
  prepareCushionCheckout,
  type CushionCheckoutServices,
} from "./checkout";
import {
  executeShopifyDraftOrder,
  shopifyDraftOrderConfigFromEnvironment,
} from "../storefront/shopify-draft-order-server";
import type { ShopifyAppProxyContext } from "../storefront/security/shopify-app-proxy-core";
import { mixedCommand } from "./mixed-server";

const responseHeaders = {
  "Cache-Control": "no-store, private",
  "X-Robots-Tag": "noindex, nofollow",
};
export function purchasesEnabled() {
  return (
    process.env.CUSHION_STUDIO_HOSTED_ENABLED === "true" &&
    process.env.CUSHION_STUDIO_PURCHASES_ENABLED === "true" &&
    process.env.CUSHION_STUDIO_WEBHOOK_ENABLED === "true" &&
    process.env.CURTAINSUK_PRODUCTION_PURCHASES_APPROVED === "true" &&
    Boolean(process.env.CUSHION_STUDIO_COMMERCIAL_APPROVAL_REFERENCE)
  );
}
export function createHostedCheckoutServices(
  context: ShopifyAppProxyContext,
  key: string,
  options: { reviewOnly?: boolean } = {},
): CushionCheckoutServices {
  if (!options.reviewOnly && !purchasesEnabled())
    throw new Error("CUSHION_PURCHASE_DISABLED");
  const repository = createHostedCushionRepository(cushionOwnerHash(context));
  const runtimeConfig = options.reviewOnly
    ? null
    : shopifyDraftOrderConfigFromEnvironment();
  if (!options.reviewOnly && runtimeConfig?.mode !== "CREATE_PRODUCTION_DRAFT")
    throw new Error("CUSHION_PURCHASE_DISABLED");
  return {
    mode: options.reviewOnly ? "REVIEW" : "APPROVED_PRODUCTION",
    now: () => new Date(),
    rules: currentCushionRules,
    facts: async (id) => {
      const facts = (await currentCushionFacts([id])).get(id);
      if (!facts) throw new Error("CUSHION_FABRIC_CURRENT_RECORD_REQUIRED");
      return facts;
    },
    identity: async (id) => {
      const record = (await cushionCatalogue(new URLSearchParams({ ids: id })))
        .items[0];
      if (!record) throw new Error("CUSHION_FABRIC_CURRENT_RECORD_REQUIRED");
      return {
        id: record.id,
        brand: record.brand,
        design: record.design,
        colour: record.colour,
      };
    },
    persist: (input) => repository.appendCheckout(input),
    existing: (key) => repository.checkout(key),
    execute: (contract) =>
      executeShopifyDraftOrder({
        contract,
        config: runtimeConfig,
        claimCreate: () => repository.claimCreate(key),
      }),
  };
}
export async function handleHostedCushionRequest(
  request: Request,
  segments: string[],
) {
  // Default OFF; no signature/rate-limit database writes occur when disabled.
  if (process.env.CUSHION_STUDIO_HOSTED_ENABLED !== "true")
    return new Response(null, { status: 404, headers: responseHeaders });
  try {
    const context = await authenticateShopifyAppProxy({
      request,
      operation: "cushion-studio",
      rateLimit: { limit: 120, windowSeconds: 60 },
    });
    if (
      request.method === "POST" &&
      (!request.headers.get("content-type")?.startsWith("application/json") ||
        (request.headers.get("origin") &&
          request.headers.get("origin") !== "https://www.curtainsuk.com"))
    )
      throw new Error("CUSHION_ORIGIN_INVALID");
    if (segments[0] !== "api") {
      if (request.method !== "GET" || segments.length > 1)
        return new Response(null, { status: 404 });
      return cushionPreviewAsset(segments[0] ?? "", {
        base: "/apps/curtainsuk-decision/cushion-studio/",
        apiBase: "/apps/curtainsuk-decision/cushion-studio/api",
        ownerPreview: false,
      });
    }
    if (segments.length !== 2)
      return new Response(null, { status: 404, headers: responseHeaders });
    const operation = segments[1],
      params = new URL(request.url).searchParams;
    let result: unknown;
    if (request.method === "GET" && operation === "catalogue")
      result = await cushionCatalogue(params);
    else if (request.method === "POST" && operation === "quote") {
      const resultRaw = await cushionTrialQuote(
        await boundedCushionBody(request),
      );
      result = {
        quotes: resultRaw.quotes.map(customerCushionQuote),
        setQuote: customerCushionQuote(resultRaw.setQuote),
        purchaseEnabled: purchasesEnabled() && resultRaw.setQuote.ready,
        source: "server",
      };
    } else if (operation === "designs") {
      const repository = createHostedCushionRepository(
        cushionOwnerHash(context),
      );
      if (request.method === "GET")
        result = params.has("id")
          ? {
              saved: await repository.load(params.get("id")!),
              persistence: "account",
            }
          : { designs: await repository.list(), persistence: "account" };
      else if (request.method === "POST") {
        const body = await boundedCushionBody(request);
        result = {
          saved: await repository.save(
            parseCushionDesign(body.design),
            Number(body.expectedRevision),
          ),
          persistence: "account",
        };
      } else return new Response(null, { status: 405 });
    } else if (request.method === "POST" && operation === "samples") {
      const body = await boundedCushionBody(request);
      result = await prepareSampleOrder({ fabricId: body.fabricId });
    } else if (
      request.method === "POST" &&
      (operation === "mixed-review" || operation === "mixed-checkout")
    ) {
      const repository = createHostedCushionRepository(
        cushionOwnerHash(context),
      );
      const body = await boundedCushionBody(request);
      if (
        typeof body.designId !== "string" ||
        !(await repository.load(body.designId))
      )
        throw new Error("CUSHION_DESIGN_SAVE_REQUIRED");
      const key =
        operation === "mixed-review"
          ? "mixed-review-only"
          : body.idempotencyKey;
      if (typeof key !== "string")
        throw new Error("CUSHION_CHECKOUT_INPUT_INVALID");
      result = await mixedCommand(
        operation,
        body,
        createHostedCheckoutServices(context, key, {
          reviewOnly: operation === "mixed-review",
        }),
        purchasesEnabled(),
      );
    } else if (request.method === "POST" && operation === "checkout") {
      if (!purchasesEnabled())
        return Response.json(
          {
            code: "CUSHION_PURCHASE_DISABLED",
            message:
              "Cushion checkout awaits final manufacturing and commercial approval.",
            purchaseEnabled: false,
          },
          { status: 409, headers: responseHeaders },
        );
      const repository = createHostedCushionRepository(
        cushionOwnerHash(context),
      );
      const body = await boundedCushionBody(request);
      if (
        typeof body.designId !== "string" ||
        typeof body.expectedQuoteId !== "string" ||
        typeof body.idempotencyKey !== "string" ||
        !Array.isArray(body.specs)
      )
        throw new Error("CUSHION_CHECKOUT_INPUT_INVALID");
      if (!(await repository.load(body.designId)))
        throw new Error("CUSHION_DESIGN_SAVE_REQUIRED");
      const key = body.idempotencyKey;
      const checkout = await prepareCushionCheckout(
        {
          designId: body.designId,
          specs: body.specs,
          expectedQuoteId: body.expectedQuoteId,
          idempotencyKey: key,
        },
        createHostedCheckoutServices(context, key),
      );
      result = {
        checkoutUrl: checkout.execution.checkoutUrl,
        purchaseEnabled: checkout.execution.paymentEnabled,
        status: checkout.execution.status,
      };
    } else return new Response(null, { status: 404, headers: responseHeaders });
    return Response.json(result, { headers: responseHeaders });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "CUSHION_SIGN_IN_REQUIRED")
      return Response.json(
        {
          code,
          message:
            "Sign in to your CurtainsUK account to save or reopen your cushion designs.",
          signInUrl: "/account/login",
        },
        { status: 401, headers: responseHeaders },
      );
    if (code === "CUSHION_REVISION_CONFLICT")
      return Response.json(
        {
          code,
          message:
            "This design changed in another session. Reopen it before saving.",
        },
        { status: 409, headers: responseHeaders },
      );
    return Response.json(
      {
        code: "CUSHION_REQUEST_UNAVAILABLE",
        message: "This request could not be completed. Please try again.",
      },
      {
        status:
          code.includes("SIGNATURE") || code.includes("ORIGIN") ? 403 : 503,
        headers: responseHeaders,
      },
    );
  }
}
