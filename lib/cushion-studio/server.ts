import "server-only";
import { cushionBrowseParams, cushionBrowseFacets } from "./browse";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  fabricMasterRecordsByIds,
  verifiedSupplierCostMinor,
} from "../fabric-master/repository";
import {
  searchRetailFabrics,
  retailFabricDetail,
} from "../fabric-master/retail-repository";
import { supplierDatabaseConfigured } from "../supabase/supplier-service";
import { dailyStockPosition } from "../storefront/daily-stock-server";
import { currentAvailableMetres } from "../storefront/daily-stock";
import { prepareSampleOrder } from "../storefront/sample-order-server";
import {
  calibrationForFabric,
  cushionOrderingTerms,
  cuttingFactsFromMaster,
  unconfirmedCuttingFacts,
  type CushionFabricCard,
  type CushionFabricEvidence,
} from "./catalogue";
import {
  parseCushionSpec,
  parseCushionDesign,
  PREVIEW_PRICING_RULES,
  type FabricCuttingFacts,
} from "./domain";
import { quoteCushion, quoteCushionSet } from "./pricing";
import { createLocalCushionRepository } from "./repository";
import { prepareCushionCheckout } from "./checkout";
import { executeShopifyDraftOrder } from "../storefront/shopify-draft-order-server";
import type { CushionPricingRules } from "./domain";
import { CURTAINSUK_RETAIL_VAT_RATE_BASIS_POINTS } from "../storefront/checkout-gates";

type PublicFabric = {
  id: string;
  brand: string;
  collection: string;
  design: string;
  colour: string;
  fabricProfileUrl?: string;
  fullWidthMm: number | null;
  usableWidthMm: number | null;
  verticalRepeatMm: number | null;
  horizontalRepeatMm: number | null;
  patternMatchType: string | null;
  imageReferences?: string[];
  sampleAvailable?: boolean;
  images?: { imageType: string; url: string }[];
};
const catalogueUrl =
  "https://www.curtainsuk.com/apps/curtainsuk-decision/catalog";
const headers = {
  "Cache-Control": "no-store, private",
  "X-Robots-Tag": "noindex, nofollow",
  "Content-Type": "application/json",
};

/** Staff-owned rules only. Neither saved designs nor request bodies can change prices. */
export async function currentCushionRules(): Promise<CushionPricingRules> {
  let source = process.env.CUSHION_STUDIO_PRICING_RULES_JSON;
  if (!source && cushionPreviewEnabled()) {
    try {
      source = await readFile(
        path.join(process.cwd(), ".cushion-studio-data/pricing-rules.json"),
        "utf8",
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  if (!source)
    return {
      ...structuredClone(PREVIEW_PRICING_RULES),
      vatBasisPoints: CURTAINSUK_RETAIL_VAT_RATE_BASIS_POINTS,
    };
  const rules = JSON.parse(source);
  const allowed = new Set([
    "version",
    "dispatchEstimate",
    "construction",
    "marginBasisPoints",
    "vatBasisPoints",
    "fixedCosts",
    "supplierCarriageMinor",
    "carriageMinor",
    "customerDeliveryGrossMinor",
    "carrierCostMinor",
    "makingRateCard",
    "compatibleInsertCostMinorBySize",
    "compatibleInsertsBySize",
    "legacyCompatibleInsertsBySize",
    "discountNetMinor",
  ]);
  if (
    !rules ||
    typeof rules !== "object" ||
    Array.isArray(rules) ||
    Object.keys(rules).some((key) => !allowed.has(key)) ||
    typeof rules.version !== "string" ||
    !rules.version.trim() ||
    !rules.construction ||
    typeof rules.construction.version !== "string" ||
    typeof rules.construction.confirmed !== "boolean"
  )
    throw new Error("CUSHION_RULES_INVALID");
  if (
    rules.vatBasisPoints != null &&
    rules.vatBasisPoints !== CURTAINSUK_RETAIL_VAT_RATE_BASIS_POINTS
  )
    throw new Error("CUSHION_RULES_VAT_AUTHORITY_MISMATCH");
  return {
    ...rules,
    vatBasisPoints: CURTAINSUK_RETAIL_VAT_RATE_BASIS_POINTS,
  } as CushionPricingRules;
}

export function cushionPreviewEnabled(env: NodeJS.ProcessEnv = process.env) {
  return (
    env.CUSHION_STUDIO_LOCAL_PREVIEW === "true" &&
    !env.VERCEL &&
    env.NODE_ENV !== "production"
  );
}

export function assertCushionPreviewRequest(request: Request) {
  const url = new URL(request.url);
  if (
    !cushionPreviewEnabled() ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  )
    throw new Error("CUSHION_PREVIEW_DISABLED");
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin)
    throw new Error("CUSHION_ORIGIN_INVALID");
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new Error("CUSHION_ORIGIN_INVALID");
}

export async function boundedCushionBody(request: Request) {
  const maximum = 128 * 1024;
  if (Number(request.headers.get("content-length") ?? 0) > maximum)
    throw new Error("CUSHION_REQUEST_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("CUSHION_BODY_REQUIRED");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maximum) {
      await reader.cancel();
      throw new Error("CUSHION_REQUEST_TOO_LARGE");
    }
    chunks.push(value);
  }
  let body: unknown;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("CUSHION_JSON_INVALID");
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new Error("CUSHION_OBJECT_REQUIRED");
  return body as Record<string, unknown>;
}

async function evidenceMap(): Promise<Record<string, CushionFabricEvidence>> {
  try {
    const file = JSON.parse(
      await readFile(
        path.join(process.cwd(), "config/cushion-studio-fabric-evidence.json"),
        "utf8",
      ),
    );
    if (file.version !== 1) throw new Error("CUSHION_EVIDENCE_VERSION_INVALID");
    return file.fabrics;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

async function publicRead(
  params: URLSearchParams,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${catalogueUrl}?${params}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("CUSHION_CATALOGUE_UNAVAILABLE");
  return response.json();
}

function approvedOriginal(
  record: PublicFabric,
  evidence?: CushionFabricEvidence,
): CushionFabricEvidence | undefined {
  if (evidence) return evidence;
  const main = record.images?.find(
    (image) =>
      image.imageType === "MAIN" &&
      /^https:\/\/cdn\.shopify\.com\//.test(image.url),
  );
  if (!main || !record.fullWidthMm) return undefined;
  return {
    originalImageUrl: main.url,
    fullWidthMm: record.fullWidthMm,
    evidence:
      "Owner confirmed source fabric images cover one supplier Full Width by 1000 mm on 2026-10-14. Approved MAIN mapping from current shared catalogue; no seamless tiling assertion.",
  };
}

function publicCard(
  record: PublicFabric,
  evidence?: CushionFabricEvidence,
): CushionFabricCard {
  const calibration = calibrationForFabric(
    { full_width_mm: record.fullWidthMm },
    approvedOriginal(record, evidence),
  );
  return {
    id: record.id,
    brand: record.brand,
    collection: record.collection,
    design: record.design,
    colour: record.colour,
    imageUrl:
      calibration?.imageUrl ??
      record.imageReferences?.find((url) => url.startsWith("https://")) ??
      null,
    fabricProfileUrl: record.fabricProfileUrl?.startsWith(
      "https://www.curtainsuk.com/pages/fabric/",
    )
      ? record.fabricProfileUrl
      : `https://www.curtainsuk.com/pages/fabric-library?fabric=${encodeURIComponent(record.id)}`,
    fullWidthMm: record.fullWidthMm,
    usableWidthMm: record.usableWidthMm,
    calibration,
    previewReady: calibration !== null,
    purchaseReady: false,
    sampleAvailable: record.sampleAvailable === true,
  };
}

function publicFacts(
  record: PublicFabric,
  evidence?: CushionFabricEvidence,
): FabricCuttingFacts {
  evidence = approvedOriginal(record, evidence);
  return {
    id: record.id,
    fullWidthMm: record.fullWidthMm,
    usableWidthMm: record.usableWidthMm,
    pattern: {
      kind:
        record.horizontalRepeatMm === 0 && record.verticalRepeatMm === 0
          ? "plain"
          : record.patternMatchType === "STRAIGHT_MATCH"
            ? "straight"
            : record.patternMatchType === "HALF_DROP_MATCH"
              ? "half-drop"
              : "unknown",
      horizontalRepeatMm: record.horizontalRepeatMm,
      verticalRepeatMm: record.verticalRepeatMm,
    },
    directional: evidence?.directional ?? null,
    calibration: calibrationForFabric(
      { full_width_mm: record.fullWidthMm },
      evidence,
    ),
    supplierCostMinorPerMetre: null,
    ...cushionOrderingTerms(evidence),
    availableMetres: null,
  };
}

export async function cushionCatalogue(params: URLSearchParams) {
  const evidence = await evidenceMap();
  if (params.has("ids")) {
    const ids = [
      ...new Set((params.get("ids") ?? "").split(",").filter(Boolean)),
    ];
    if (
      !ids.length ||
      ids.length > 24 ||
      ids.some((id) => !/^[A-Za-z0-9][A-Za-z0-9_-]{0,149}$/.test(id))
    )
      throw new Error("CUSHION_IDS_INVALID");
    const cards = await Promise.all(
      ids.map(async (id) => {
        const result = supplierDatabaseConfigured()
          ? await retailFabricDetail(id, false, { includeIntelligence: false })
          : await publicRead(
              new URLSearchParams({ view: "retail", fabric: id }),
            );
        const record =
          result &&
          (("fabric" in result
            ? result.fabric
            : result) as PublicFabric | null);
        return record?.id === id ? publicCard(record, evidence[id]) : null;
      }),
    );
    const items = cards.filter(
      (card): card is CushionFabricCard => card !== null,
    );
    return {
      items,
      total: items.length,
      nextOffset: null,
      source: "current-fabric-identities",
      purchaseEnabled: false,
    };
  }
  // Governed bounded catalogue search, independent of the curtain renderer.
  const offset = Math.max(
    0,
    Number.parseInt(params.get("offset") ?? "0", 10) || 0,
  );
  const sourceParams = cushionBrowseParams(params);
  const source = supplierDatabaseConfigured()
    ? await searchRetailFabrics(sourceParams, { includeIntelligence: false })
    : await publicRead(sourceParams);
  const records = source.fabrics as PublicFabric[] | undefined;
  if (!Array.isArray(records) || !Number.isFinite(source.total))
    throw new Error("CUSHION_CATALOGUE_UNAVAILABLE");
  return {
    items: records.map((record) => publicCard(record, evidence[record.id])),
    total: Number(source.total),
    facets: cushionBrowseFacets(source.facets),
    nextOffset: offset + 24 < Number(source.total) ? offset + 24 : null,
    source: supplierDatabaseConfigured()
      ? "fabric-master"
      : "shared-public-catalogue",
    purchaseEnabled: false,
  };
}

/** Actual reviewed source records for the initial calibrated examples, never fake fabric. */
export async function cushionEvidenceCatalogue() {
  const evidence = await evidenceMap();
  const sources = JSON.parse(
    await readFile(
      path.join(
        process.cwd(),
        "artifacts/cushion-studio-evidence/source-records.json",
      ),
      "utf8",
    ),
  ) as { fabric: PublicFabric }[];
  return {
    items: sources.map((source) =>
      publicCard(source.fabric, evidence[source.fabric.id]),
    ),
    total: sources.length,
    nextOffset: null,
    source: "reviewed-source-records",
    purchaseEnabled: false,
  };
}

export async function currentCushionFacts(ids: string[]) {
  if (
    !ids.length ||
    ids.length > 48 ||
    ids.some((id) => !/^[A-Za-z0-9][A-Za-z0-9_-]{0,149}$/.test(id))
  )
    throw new Error("CUSHION_IDS_INVALID");
  const evidence = await evidenceMap();
  const facts = new Map<string, FabricCuttingFacts>();
  if (supplierDatabaseConfigured()) {
    const records = await fabricMasterRecordsByIds(ids);
    await Promise.all(
      records.map(async (record) => {
        if (record.lifecycle_state !== "CURRENT") {
          // Browse may show an unconfirmed fabric for design exploration.
          // Keep its identity and cutting facts so the quote can explain why
          // it is unavailable, but never attach a cost or verified stock.
          facts.set(record.fabric_id, unconfirmedCuttingFacts(record, evidence[record.fabric_id]));
          return;
        }
        const [price, stock, retail] = await Promise.allSettled([
          verifiedSupplierCostMinor(record.supplier_id, record.supplier_sku),
          dailyStockPosition(record.supplier_id, record.supplier_sku),
          retailFabricDetail(record.fabric_id, false, {
            includeIntelligence: false,
          }),
        ]);
        const original =
          evidence[record.fabric_id] ??
          (retail.status === "fulfilled" && retail.value
            ? approvedOriginal(retail.value)
            : undefined);
        const available =
          stock.status === "fulfilled"
            ? currentAvailableMetres(stock.value.position)
            : null;
        facts.set(record.fabric_id, {
          ...cuttingFactsFromMaster(record, original),
          supplierCostMinorPerMetre:
            price.status === "fulfilled" ? price.value : null,
          availableMetres: available,
        });
      }),
    );
  } else {
    await Promise.all(
      ids.map(async (id) => {
        const result = await publicRead(
          new URLSearchParams({ view: "retail", fabric: id }),
        );
        const record = (result.fabric ?? result) as PublicFabric;
        if (record.id === id) facts.set(id, publicFacts(record, evidence[id]));
      }),
    );
  }
  return facts;
}

export async function cushionTrialQuote(input: Record<string, unknown>) {
  const specs = (Array.isArray(input.specs) ? input.specs : [input.spec]).map(
    parseCushionSpec,
  );
  if (
    !specs.length ||
    specs.length > 32 ||
    new Set(specs.map((spec) => spec.id)).size !== specs.length
  )
    throw new Error("CUSHION_QUOTE_PIECES_INVALID");
  const ids = [
    ...new Set(
      specs.flatMap((spec) => [
        spec.fabricId,
        ...(spec.edge === "contrast" && spec.pipingFabricId
          ? [spec.pipingFabricId]
          : []),
      ]),
    ),
  ];
  const facts = await currentCushionFacts(ids);
  const rules = await currentCushionRules();
  const inputs = specs.map((spec) => {
    const fabric = facts.get(spec.fabricId);
    if (!fabric) throw new Error("CUSHION_FABRIC_CURRENT_RECORD_REQUIRED");
    return {
      spec,
      facts: fabric,
      pipingFacts: spec.pipingFabricId
        ? facts.get(spec.pipingFabricId)
        : undefined,
    };
  });
  const quotes = inputs.map((input) =>
    quoteCushion(input.spec, input.facts, rules, input.pipingFacts),
  );
  return {
    quotes,
    setQuote: quoteCushionSet(inputs, rules),
    audience: "owner-local-review",
    purchaseEnabled: false,
    source: "server",
    revalidatedAt: new Date().toISOString(),
  };
}

/** Real repository/transport wiring, intentionally inaccessible from the
 * purchase endpoint. No transport configuration or hosted writes are enabled. */
export async function prepareLocalCushionCheckout(
  input: Parameters<typeof prepareCushionCheckout>[0],
) {
  if (!cushionPreviewEnabled()) throw new Error("CUSHION_PREVIEW_DISABLED");
  const repository = createLocalCushionRepository(
    path.join(process.cwd(), ".cushion-studio-data"),
  );
  return prepareCushionCheckout(input, {
    now: () => new Date(),
    rules: currentCushionRules,
    facts: async (id) => {
      const record = (await currentCushionFacts([id])).get(id);
      if (!record) throw new Error("CUSHION_FABRIC_CURRENT_RECORD_REQUIRED");
      return record;
    },
    identity: async (id) => {
      const result = await cushionCatalogue(new URLSearchParams({ ids: id }));
      const record = result.items[0];
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
    execute: (contract) => executeShopifyDraftOrder({ contract, config: null }),
  });
}

export async function handleCushionApi(request: Request, operation: string) {
  try {
    assertCushionPreviewRequest(request);
    const params = new URL(request.url).searchParams;
    const repository = createLocalCushionRepository(
      path.join(process.cwd(), ".cushion-studio-data"),
    );
    let result: unknown;
    if (request.method === "GET" && operation === "catalogue")
      result =
        params.get("examples") === "1"
          ? await cushionEvidenceCatalogue()
          : await cushionCatalogue(params);
    else if (request.method === "POST" && operation === "quote")
      result = await cushionTrialQuote(await boundedCushionBody(request));
    else if (request.method === "GET" && operation === "designs")
      result = params.has("id")
        ? {
            saved: await repository.load(params.get("id")!),
            persistence: "local-disk",
          }
        : { designs: await repository.list(), persistence: "local-disk" };
    else if (request.method === "POST" && operation === "designs") {
      const body = await boundedCushionBody(request);
      result = {
        saved: await repository.save(
          parseCushionDesign(body.design),
          Number(body.expectedRevision),
        ),
        persistence: "local-disk",
      };
    } else if (request.method === "POST" && operation === "samples") {
      if (!supplierDatabaseConfigured())
        return Response.json(
          {
            code: "CUSHION_SAMPLE_HANDOFF_UNAVAILABLE",
            message:
              "Sample checkout needs the existing authenticated commerce service. Choose this fabric on CurtainsUK to order its sample.",
            sampleUrl: "https://www.curtainsuk.com/pages/fabrics",
            purchaseEnabled: false,
          },
          { status: 503, headers },
        );
      const body = await boundedCushionBody(request);
      result = {
        ...(await prepareSampleOrder({ fabricId: body.fabricId })),
        purchaseEnabled: false,
        previewOnly: true,
      };
    } else if (request.method === "POST" && operation === "checkout") {
      return Response.json(
        {
          code: "CUSHION_PURCHASE_DISABLED",
          message:
            "Checkout is not enabled for this local review. Save your design while manufacturing and pricing rules are confirmed.",
          purchaseEnabled: false,
        },
        { status: 409, headers },
      );
    } else
      return Response.json({ code: "NOT_FOUND" }, { status: 404, headers });
    return Response.json(result, { headers });
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "CUSHION_SERVICE_UNAVAILABLE";
    const safe = /^CUSHION_[A-Z_]+$/.test(code)
      ? code
      : "CUSHION_SERVICE_UNAVAILABLE";
    const status =
      safe === "CUSHION_PREVIEW_DISABLED"
        ? 404
        : safe === "CUSHION_ORIGIN_INVALID"
          ? 403
          : /CONFLICT|BUSY/.test(safe)
            ? 409
            : /UNAVAILABLE/.test(safe)
              ? 503
              : 400;
    return Response.json(
      {
        code: safe,
        message:
          safe === "CUSHION_SERVICE_UNAVAILABLE"
            ? "The current fabric service could not be reached. No quote or order has been created."
            : safe.replaceAll("_", " ").toLowerCase(),
      },
      { status, headers },
    );
  }
}
