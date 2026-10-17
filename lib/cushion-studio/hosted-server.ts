import "server-only";
import {randomUUID} from "node:crypto";
import {trackDiagnostic} from "../smart-track/server";
import {createTrackServices} from "../smart-track/repository";
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
import { ShopifyAppProxyError } from "../storefront/security/shopify-app-proxy-core";
import { endpointRateLimitResponse } from "../storefront/security/endpoint-rate-limit";

import { reviewMyHome, checkoutMyHome, type MyHomeInput, type MyHomeCheckoutInput } from "./my-home";
import { createMyHomeServices } from "./my-home-server";

const responseHeaders = {
  "Cache-Control": "no-store, private",
  "X-Robots-Tag": "noindex, nofollow",
};
const productionOrigin = "https://www.curtainsuk.com";

function cushionAllowedOrigin() {
  const configured = process.env.CURTAINSUK_CUSHION_ALLOWED_ORIGIN;
  if (!configured) return productionOrigin;
  const url = new URL(configured);
  if (url.protocol !== "https:" || url.origin !== configured || url.username || url.password)
    throw new Error("CUSHION_ORIGIN_CONFIG_INVALID");
  return configured;
}
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
  const repository = () => createHostedCushionRepository(cushionOwnerHash(context));
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
    persist: (input) => repository().appendCheckout(input),
    existing: (key) => repository().checkout(key),
    execute: (contract) =>
      executeShopifyDraftOrder({
        contract,
        config: runtimeConfig,
        claimCreate: () => repository().claimCreate(key),
      }),
  };
}
// Explicit input allowlist keeps internal pricing, database and supplier failures private.
const clientInputErrors = new Set([
  "CUSHION_BODY_REQUIRED",
  "CUSHION_JSON_INVALID",
  "CUSHION_OBJECT_REQUIRED",
  "CUSHION_CHECKOUT_INPUT_INVALID",
  "CUSHION_IDS_INVALID",
  "CUSHION_QUOTE_PIECES_INVALID",
  "CUSHION_COLOUR_INVALID",
  "CUSHION_DESIGN_INVALID",
  "CUSHION_DESIGN_NAME_INVALID",
  "CUSHION_DESIGN_PIECES_INVALID",
  "CUSHION_DUPLICATE_ID",
  "CUSHION_EDGE_INVALID",
  "CUSHION_FILLING_INVALID",
  "CUSHION_ID_INVALID",
  "CUSHION_PLACEMENT_INVALID",
  "CUSHION_QUANTITY_INVALID",
  "CUSHION_SCENE_POSITION_INVALID",
  "CUSHION_SIZE_INVALID",
  "CUSHION_SPEC_VERSION",
  "CUSHION_VERSION_UNSUPPORTED",
  "CUSHION_REVISION_REQUIRED",
]);

/** Server-owned seams for offline integration rehearsal. No request can supply these. */
export interface HostedCushionServices {
  enabled(): boolean;
  purchasesEnabled(): boolean;
  myHomeEnabled?(): boolean;
  myHomeServices?: typeof createMyHomeServices;
  authenticate: typeof authenticateShopifyAppProxy;
  repository(
    ownerHash: string,
  ): Pick<
    ReturnType<typeof createHostedCushionRepository>,
    "load" | "list" | "save"
  >;
  catalogue: typeof cushionCatalogue;
  quote: typeof cushionTrialQuote;
  sample: typeof prepareSampleOrder;
  asset: typeof cushionPreviewAsset;
  checkoutServices: typeof createHostedCheckoutServices;
  mixed: typeof mixedCommand;
}

const productionServices: HostedCushionServices = {
  enabled: () => process.env.CUSHION_STUDIO_HOSTED_ENABLED === "true",
  purchasesEnabled,
  myHomeEnabled: () => process.env.CURTAINSUK_MY_HOME_ENABLED === "true",
  myHomeServices: createMyHomeServices,
  authenticate: authenticateShopifyAppProxy,
  repository: createHostedCushionRepository,
  catalogue: cushionCatalogue,
  quote: cushionTrialQuote,
  sample: prepareSampleOrder,
  asset: cushionPreviewAsset,
  checkoutServices: createHostedCheckoutServices,
  mixed: mixedCommand,
};

export function createHostedCushionHandler(services: HostedCushionServices) {
  return async function handleHostedCushionRequest(
    request: Request,
    segments: string[],
  ) {
    // Default OFF; no signature/rate-limit database writes occur when disabled.
    const myHomeOperation = segments[0] === "api" && ["my-home-review","my-home-checkout"].includes(segments[1]);
    if (myHomeOperation ? !(services.myHomeEnabled?.() ?? services.enabled()) : !services.enabled())
      return new Response(null, { status: 404, headers: responseHeaders });
    let trackRequestId:string|undefined;
    try {
      const context = await services.authenticate({
        request,
        operation: "cushion-studio",
        rateLimit: { limit: 120, windowSeconds: 60 },
      });
      if (
        request.method === "POST" &&
        (!request.headers.get("content-type")?.startsWith("application/json") ||
          (request.headers.get("origin") &&
            request.headers.get("origin") !== cushionAllowedOrigin()))
      )
        throw new Error("CUSHION_ORIGIN_INVALID");
      if (segments[0] !== "api") {
        if (request.method !== "GET" || segments.length > 1)
          return new Response(null, { status: 404 });
        return services.asset(segments[0] ?? "", {
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
      if (request.method === "POST" && myHomeOperation) {
        const body = await boundedCushionBody(request);
        if(body.tracks)trackRequestId=randomUUID();
        const reviewOnly = operation === "my-home-review" || !body.cushions;
        const key = operation === "my-home-review" ? "my-home-review-only" : body.idempotencyKey;
        if (typeof key !== "string") throw Error("MY_HOME_INPUT_INVALID");
        const authority = (services.myHomeServices ?? createMyHomeServices)(services.checkoutServices(context,key,{reviewOnly}),{cushionPurchasesEnabled:services.purchasesEnabled(),tracks:body.tracks?createTrackServices(context):undefined});
        result = operation === "my-home-review" ? await reviewMyHome(body as MyHomeInput,authority) : await checkoutMyHome(body as MyHomeCheckoutInput,authority);
      } else if (request.method === "GET" && operation === "catalogue")
        result = await services.catalogue(params);
      else if (request.method === "POST" && operation === "quote") {
        const resultRaw = await services.quote(
          await boundedCushionBody(request),
        );
        result = {
          quotes: resultRaw.quotes.map(customerCushionQuote),
          setQuote: customerCushionQuote(resultRaw.setQuote),
          // Release permission is independent of the requested purchase scope.
          // Each individual/set quote carries its own purchaseReady (including
          // dispatch); an unrelated blocked piece must not disable a ready one.
          purchaseEnabled: services.purchasesEnabled(),
          source: "server",
        };
      } else if (operation === "designs") {
        const repository = services.repository(cushionOwnerHash(context));
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
        result = await services.sample({ fabricId: body.fabricId });
      } else if (
        request.method === "POST" &&
        (operation === "mixed-review" || operation === "mixed-checkout")
      ) {
        const repository = services.repository(cushionOwnerHash(context));
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
        result = await services.mixed(
          operation,
          body,
          services.checkoutServices(context, key, {
            reviewOnly: operation === "mixed-review",
          }),
          services.purchasesEnabled(),
        );
      } else if (request.method === "POST" && operation === "checkout") {
        if (!services.purchasesEnabled())
          return Response.json(
            {
              code: "CUSHION_PURCHASE_DISABLED",
              message:
                "Cushion checkout awaits final manufacturing and commercial approval.",
              purchaseEnabled: false,
            },
            { status: 409, headers: responseHeaders },
          );
        const repository = services.repository(cushionOwnerHash(context));
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
          services.checkoutServices(context, key),
        );
        result = {
          checkoutUrl: checkout.execution.checkoutUrl,
          purchaseEnabled: checkout.execution.paymentEnabled,
          status: checkout.execution.status,
        };
      } else
        return new Response(null, { status: 404, headers: responseHeaders });
      return Response.json(trackRequestId?{...(result as Record<string,unknown>),requestId:trackRequestId}:result, { headers: responseHeaders });
    } catch (error) {
      if(trackRequestId)trackDiagnostic(segments[1]==='my-home-checkout'?'CHECKOUT':'REVIEW',trackRequestId);
      const code = error instanceof Error ? error.message : "";
      if (segments[0] === "api" && segments[1] === "my-home-checkout") {
        const safeCode = /^(?:SHOPIFY|MY_HOME|CUSHION|CURTAINSUK)_[A-Z0-9_]{1,100}$/.test(code)
          ? code
          : "UNCLASSIFIED";
        console.error(JSON.stringify({ event: "MY_HOME_CHECKOUT_FAILURE", code: safeCode }));
      }
      const rateLimit = endpointRateLimitResponse(error);
      if (rateLimit)
        return Response.json(
          {
            code:
              rateLimit.status === 429
                ? "CUSHION_RATE_LIMITED"
                : "CUSHION_REQUEST_UNAVAILABLE",
            message: rateLimit.message,
          },
          {
            status: rateLimit.status,
            headers: { ...responseHeaders, ...rateLimit.headers },
          },
        );
      if (
        error instanceof ShopifyAppProxyError ||
        code === "CUSHION_ORIGIN_INVALID"
      )
        return Response.json(
          {
            code: "CUSHION_REQUEST_REJECTED",
            message:
              "This request could not be verified. Reload Cushion Studio and try again.",
          },
          { status: 403, headers: responseHeaders },
        );
      const recoverable: Record<string, string> = {
        MY_HOME_REVIEW_CHANGED: "Your order or price has changed. Update the My Home review before continuing.",
        TRACK_UNAVAILABLE: "Smart-track ordering is not currently available. Your saved design is unchanged.",
        TRACK_ORDER_TOO_LARGE: "This combined order needs an assisted checkout. Please contact CurtainsUK.",
        TRACK_IDEMPOTENCY_CONFLICT: "This attempt belongs to a different order review. Recheck My Home before continuing.",
        MY_HOME_PURCHASE_DISABLED: "Ordering is not yet enabled for these items. Review the outstanding confirmations in My Home.",
        MY_HOME_IDEMPOTENCY_CONFLICT: "This checkout attempt belongs to a different order review. Recheck My Home before continuing.",
        CUSHION_PURCHASE_DISABLED: "Cushion ordering is not yet enabled. Your items remain saved in My Home.",
        CUSHION_DISPATCH_ESTIMATE_REQUIRED:
          "A cushion dispatch estimate must be confirmed before ordering. You can still save and review your design.",
        CUSHION_DESIGN_SAVE_REQUIRED:
          "Save your cushion design before continuing to checkout.",
        CUSHION_PRICE_OR_SPEC_CHANGED:
          "Your price or specification has changed. Review the updated cushion price before continuing.",
        CUSHION_CHECKOUT_REVALIDATION_REQUIRED:
          "This configuration needs another price or manufacturing review before ordering.",
        CUSHION_CHECKOUT_IDEMPOTENCY_CONFLICT:
          "This checkout attempt belongs to an earlier configuration. Review your current design before trying again.",
      };
      if (recoverable[code])
        return Response.json(
          { code, message: recoverable[code] },
          { status: 409, headers: responseHeaders },
        );
      if (code === "CUSHION_REQUEST_TOO_LARGE")
        return Response.json(
          {
            code,
            message:
              "This request is too large. Reopen your saved design and try again.",
          },
          { status: 413, headers: responseHeaders },
        );
      if (clientInputErrors.has(code) || ["MY_HOME_INPUT_INVALID","MY_HOME_IDENTITY_MISMATCH","MY_HOME_CHECKOUT_INVALID"].includes(code))
        return Response.json(
          {
            code: "CUSHION_INPUT_INVALID",
            message:
              "Some cushion details are invalid. Check your design and try again.",
          },
          { status: 400, headers: responseHeaders },
        );
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
          status: 503,
          headers: responseHeaders,
        },
      );
    }
  };
}

export const handleHostedCushionRequest =
  createHostedCushionHandler(productionServices);
