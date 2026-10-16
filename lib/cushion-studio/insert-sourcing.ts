import type { CushionPricingRules } from "./domain";

export const DUNELM_RANGE_VERSION = "standard-inserts-v1";
export const DUNELM_INSERT_SOURCE = {
  supplier: "Dunelm", checkedOn: "2026-10-16", currency: "GBP",
  priceBasis: "VAT-inclusive retail purchase price", vatBasisPoints: 2000,
  termsUrl: "https://www.dunelm.com/info/help/terms-and-conditions",
  procurementNote: "Confirm ongoing business supply and applicable delivery. No stock reservation or supplier agreement is implied.",
};
/** Raw supplier pad dimensions and owner-proposed finished covers remain separate. */
export const DUNELM_STANDARD_INSERT_CANDIDATES = [
  {
    "supplierSku": "30678578",
    "productId": "1000114896",
    "productName": "Square Cotton Cushion Pad",
    "sourceUrl": "https://www.dunelm.com/product/cotton-cushion-pad-1000114896?defaultSkuId=30678578",
    "advertisedSize": "37cm x 37cm",
    "insertDimensionsMm": [
      370,
      370
    ],
    "dimensionOrder": "supplier width, height",
    "shape": "square",
    "grossPriceMinor": 400,
    "supplierFillingDescription": "polyester hollowfibre with cotton casing",
    "hollowfibreVerified": true,
    "observedInStock": true,
    "observedAt": "2026-10-16T03:18:31.809999+00:00",
    "intendedFinishedCoverDimensionsMm": [
      350,
      350
    ],
    "fitStatus": "pending",
    "fitReference": "Owner-proposed 20 mm smaller flat cover dimensions, 2026-10-16; representative physical fit checks pending."
  },
  {
    "supplierSku": "30287929",
    "productId": "1000114896",
    "productName": "Square Cotton Cushion Pad",
    "sourceUrl": "https://www.dunelm.com/product/cotton-cushion-pad-1000114896?defaultSkuId=30287929",
    "advertisedSize": "67cm x 67cm",
    "insertDimensionsMm": [
      670,
      670
    ],
    "dimensionOrder": "supplier width, height",
    "shape": "square",
    "grossPriceMinor": 1200,
    "supplierFillingDescription": "polyester hollowfibre with cotton casing",
    "hollowfibreVerified": true,
    "observedInStock": true,
    "observedAt": "2026-10-16T03:18:31.809999+00:00",
    "intendedFinishedCoverDimensionsMm": [
      650,
      650
    ],
    "fitStatus": "pending",
    "fitReference": "Owner-proposed 20 mm smaller flat cover dimensions, 2026-10-16; representative physical fit checks pending."
  },
  {
    "supplierSku": "30926443",
    "productId": "1000114896",
    "productName": "Square Cotton Cushion Pad",
    "sourceUrl": "https://www.dunelm.com/product/cotton-cushion-pad-1000114896?defaultSkuId=30926443",
    "advertisedSize": "47cm x 47cm",
    "insertDimensionsMm": [
      470,
      470
    ],
    "dimensionOrder": "supplier width, height",
    "shape": "square",
    "grossPriceMinor": 600,
    "supplierFillingDescription": "polyester hollowfibre with cotton casing",
    "hollowfibreVerified": true,
    "observedInStock": true,
    "observedAt": "2026-10-16T03:18:31.809999+00:00",
    "intendedFinishedCoverDimensionsMm": [
      450,
      450
    ],
    "fitStatus": "pending",
    "fitReference": "Owner-proposed 20 mm smaller flat cover dimensions, 2026-10-16; representative physical fit checks pending."
  },
  {
    "supplierSku": "30287927",
    "productId": "1000114896",
    "productName": "Square Cotton Cushion Pad",
    "sourceUrl": "https://www.dunelm.com/product/cotton-cushion-pad-1000114896?defaultSkuId=30287927",
    "advertisedSize": "57cm x 57cm",
    "insertDimensionsMm": [
      570,
      570
    ],
    "dimensionOrder": "supplier width, height",
    "shape": "square",
    "grossPriceMinor": 900,
    "supplierFillingDescription": "polyester hollowfibre with cotton casing",
    "hollowfibreVerified": true,
    "observedInStock": false,
    "observedAt": "2026-10-16T03:18:31.809999+00:00",
    "intendedFinishedCoverDimensionsMm": [
      550,
      550
    ],
    "fitStatus": "pending",
    "fitReference": "Owner-proposed 20 mm smaller flat cover dimensions, 2026-10-16; representative physical fit checks pending."
  },
  {
    "supplierSku": "30287928",
    "productId": "1000114896",
    "productName": "Square Cotton Cushion Pad",
    "sourceUrl": "https://www.dunelm.com/product/cotton-cushion-pad-1000114896?defaultSkuId=30287928",
    "advertisedSize": "62cm x 62cm",
    "insertDimensionsMm": [
      620,
      620
    ],
    "dimensionOrder": "supplier width, height",
    "shape": "square",
    "grossPriceMinor": 1000,
    "supplierFillingDescription": "polyester hollowfibre with cotton casing",
    "hollowfibreVerified": true,
    "observedInStock": true,
    "observedAt": "2026-10-16T03:18:31.809999+00:00",
    "intendedFinishedCoverDimensionsMm": [
      600,
      600
    ],
    "fitStatus": "pending",
    "fitReference": "Owner-proposed 20 mm smaller flat cover dimensions, 2026-10-16; representative physical fit checks pending."
  },
  {
    "supplierSku": "30287926",
    "productId": "1000114896",
    "productName": "Square Cotton Cushion Pad",
    "sourceUrl": "https://www.dunelm.com/product/cotton-cushion-pad-1000114896?defaultSkuId=30287926",
    "advertisedSize": "52cm x 52cm",
    "insertDimensionsMm": [
      520,
      520
    ],
    "dimensionOrder": "supplier width, height",
    "shape": "square",
    "grossPriceMinor": 700,
    "supplierFillingDescription": "polyester hollowfibre with cotton casing",
    "hollowfibreVerified": true,
    "observedInStock": true,
    "observedAt": "2026-10-16T03:18:31.809999+00:00",
    "intendedFinishedCoverDimensionsMm": [
      500,
      500
    ],
    "fitStatus": "pending",
    "fitReference": "Owner-proposed 20 mm smaller flat cover dimensions, 2026-10-16; representative physical fit checks pending."
  },
  {
    "supplierSku": "30678641",
    "productId": "1000114896",
    "productName": "Square Cotton Cushion Pad",
    "sourceUrl": "https://www.dunelm.com/product/cotton-cushion-pad-1000114896?defaultSkuId=30678641",
    "advertisedSize": "70cm x 70cm",
    "insertDimensionsMm": [
      700,
      700
    ],
    "dimensionOrder": "supplier width, height",
    "shape": "square",
    "grossPriceMinor": 1400,
    "supplierFillingDescription": "polyester hollowfibre with cotton casing",
    "hollowfibreVerified": true,
    "observedInStock": true,
    "observedAt": "2026-10-16T03:18:31.809999+00:00",
    "intendedFinishedCoverDimensionsMm": [
      680,
      680
    ],
    "fitStatus": "pending",
    "fitReference": "Owner-proposed 20 mm smaller flat cover dimensions, 2026-10-16; representative physical fit checks pending."
  },
  {
    "supplierSku": "30287924",
    "productId": "1000114896",
    "productName": "Square Cotton Cushion Pad",
    "sourceUrl": "https://www.dunelm.com/product/cotton-cushion-pad-1000114896?defaultSkuId=30287924",
    "advertisedSize": "42cm x 42cm",
    "insertDimensionsMm": [
      420,
      420
    ],
    "dimensionOrder": "supplier width, height",
    "shape": "square",
    "grossPriceMinor": 500,
    "supplierFillingDescription": "polyester hollowfibre with cotton casing",
    "hollowfibreVerified": true,
    "observedInStock": true,
    "observedAt": "2026-10-16T03:18:31.809999+00:00",
    "intendedFinishedCoverDimensionsMm": [
      400,
      400
    ],
    "fitStatus": "pending",
    "fitReference": "Owner-proposed 20 mm smaller flat cover dimensions, 2026-10-16; representative physical fit checks pending."
  },
  {
    "supplierSku": "30287925",
    "productId": "1000114896",
    "productName": "Square Cotton Cushion Pad",
    "sourceUrl": "https://www.dunelm.com/product/cotton-cushion-pad-1000114896?defaultSkuId=30287925",
    "advertisedSize": "45cm x 45cm",
    "insertDimensionsMm": [
      450,
      450
    ],
    "dimensionOrder": "supplier width, height",
    "shape": "square",
    "grossPriceMinor": 600,
    "supplierFillingDescription": "polyester hollowfibre with cotton casing",
    "hollowfibreVerified": true,
    "observedInStock": true,
    "observedAt": "2026-10-16T03:18:31.809999+00:00",
    "intendedFinishedCoverDimensionsMm": null,
    "fitStatus": "pending",
    "fitReference": null
  },
  {
    "supplierSku": "30678577",
    "productId": "1000114896",
    "productName": "Square Cotton Cushion Pad",
    "sourceUrl": "https://www.dunelm.com/product/cotton-cushion-pad-1000114896?defaultSkuId=30678577",
    "advertisedSize": "30cm x 30cm",
    "insertDimensionsMm": [
      300,
      300
    ],
    "dimensionOrder": "supplier width, height",
    "shape": "square",
    "grossPriceMinor": 350,
    "supplierFillingDescription": "polyester hollowfibre with cotton casing",
    "hollowfibreVerified": true,
    "observedInStock": true,
    "observedAt": "2026-10-16T03:18:31.809999+00:00",
    "intendedFinishedCoverDimensionsMm": null,
    "fitStatus": "pending",
    "fitReference": null
  },
  {
    "supplierSku": "30926442",
    "productId": "1000159252",
    "productName": "Cotton Cushion Pad",
    "sourceUrl": "https://www.dunelm.com/product/cotton-cushion-pad-1000159252?defaultSkuId=30926442",
    "advertisedSize": "41cm x 15cm",
    "insertDimensionsMm": [
      410,
      150
    ],
    "dimensionOrder": "listed dimensions; cylinder shown, length/diameter fit not certified",
    "shape": "bolster",
    "grossPriceMinor": 500,
    "supplierFillingDescription": "polyester-filled insert with cotton casing",
    "hollowfibreVerified": false,
    "observedInStock": true,
    "observedAt": "2026-10-16T03:18:32.269622+00:00",
    "intendedFinishedCoverDimensionsMm": null,
    "fitStatus": "pending",
    "fitReference": null
  },
  {
    "supplierSku": "30678580",
    "productId": "1000159252",
    "productName": "Cotton Cushion Pad",
    "sourceUrl": "https://www.dunelm.com/product/cotton-cushion-pad-1000159252?defaultSkuId=30678580",
    "advertisedSize": "40cm x 60cm",
    "insertDimensionsMm": [
      400,
      600
    ],
    "dimensionOrder": "supplier width, height",
    "shape": "rectangle",
    "grossPriceMinor": 600,
    "supplierFillingDescription": "polyester-filled insert with cotton casing",
    "hollowfibreVerified": false,
    "observedInStock": false,
    "observedAt": "2026-10-16T03:18:32.269622+00:00",
    "intendedFinishedCoverDimensionsMm": [
      580,
      380
    ],
    "fitStatus": "pending",
    "fitReference": "Owner-proposed 20 mm smaller flat cover dimensions, 2026-10-16; representative physical fit checks pending."
  },
  {
    "supplierSku": "30663252",
    "productId": "1000159252",
    "productName": "Cotton Cushion Pad",
    "sourceUrl": "https://www.dunelm.com/product/cotton-cushion-pad-1000159252?defaultSkuId=30663252",
    "advertisedSize": "30cm x 50cm",
    "insertDimensionsMm": [
      300,
      500
    ],
    "dimensionOrder": "supplier width, height",
    "shape": "rectangle",
    "grossPriceMinor": 600,
    "supplierFillingDescription": "polyester-filled insert with cotton casing",
    "hollowfibreVerified": false,
    "observedInStock": true,
    "observedAt": "2026-10-16T03:18:32.269622+00:00",
    "intendedFinishedCoverDimensionsMm": [
      480,
      280
    ],
    "fitStatus": "pending",
    "fitReference": "Owner-proposed 20 mm smaller flat cover dimensions, 2026-10-16; representative physical fit checks pending."
  },
  {
    "supplierSku": "30926140",
    "productId": "1000159252",
    "productName": "Cotton Cushion Pad",
    "sourceUrl": "https://www.dunelm.com/product/cotton-cushion-pad-1000159252?defaultSkuId=30926140",
    "advertisedSize": "46cm x 20cm",
    "insertDimensionsMm": [
      460,
      200
    ],
    "dimensionOrder": "length, diameter; cylindrical form verified from exact SKU image, corroborated by Dunelm bolster range",
    "shape": "bolster",
    "grossPriceMinor": 600,
    "supplierFillingDescription": "polyester-filled insert with cotton casing",
    "hollowfibreVerified": false,
    "observedInStock": true,
    "observedAt": "2026-10-16T03:18:32.269622+00:00",
    "intendedFinishedCoverDimensionsMm": [190, 440],
    "fitStatus": "pending",
    "fitReference": "Proposed 19 cm diameter x 44 cm cover for verified cylindrical pad, physical fit pending."
  },
  {
    "supplierSku": "30678579",
    "productId": "1000159252",
    "productName": "Cotton Cushion Pad",
    "sourceUrl": "https://www.dunelm.com/product/cotton-cushion-pad-1000159252?defaultSkuId=30678579",
    "advertisedSize": "30cm x 40cm",
    "insertDimensionsMm": [
      300,
      400
    ],
    "dimensionOrder": "supplier width, height",
    "shape": "rectangle",
    "grossPriceMinor": 300,
    "supplierFillingDescription": "polyester-filled insert with cotton casing",
    "hollowfibreVerified": false,
    "observedInStock": true,
    "observedAt": "2026-10-16T03:18:32.269622+00:00",
    "intendedFinishedCoverDimensionsMm": null,
    "fitStatus": "pending",
    "fitReference": null
  }
] as const;
export const DUNELM_RANGE_GAPS = {
  fit: "Owner-proposed pairings require representative physical fit checks; not Dunelm-confirmed guidance.",
  round: "Willows Direct standard hollowfibre round variants selected as the authorised retail exception.",
  rectangle: "Polyester-filled insert with cotton casing accepted; no unverified hollowfibre claim.",
  bolster: "Dunelm cylindrical SKU 30926140 selected: proposed diameter 19 x length 44 cm cover for diameter 20 x length 46 cm pad. Physical fit remains pending. Original 23 x 56 cm saved designs retain their meaning.",
  bespoke: "Bespoke inserts are not part of this range or a sourcing requirement.",
} as const;

export const DUNELM_INSERTS_BY_SIZE: NonNullable<CushionPricingRules["compatibleInsertsBySize"]> = Object.fromEntries(
  ([["square-35", "30678578", [350, 350]], ["square-40", "30287924", [400, 400]], ["square-45", "30926443", [450, 450]], ["square-50", "30287926", [500, 500]], ["square-55", "30287927", [550, 550]], ["square-60", "30287928", [600, 600]], ["bed-square-65", "30287929", [650, 650]], ["bed-square-68", "30678641", [680, 680]], ["rectangle-28-48", "30663252", [480, 280]], ["rectangle-38-58", "30678580", [580, 380]], ["bolster-19-44", "30926140", [190, 440]]] as const).map(([coverSizeId, sku, coverDimensions]) => {
    const pad = DUNELM_STANDARD_INSERT_CANDIDATES.find(row => row.supplierSku === sku)!;
    return [coverSizeId, {
      fillingType: pad.hollowfibreVerified ? "hollowfibre" : "polyester",
      supplierSku: sku, coverSizeId,
      dimensionsMm: pad.shape === "rectangle" || pad.shape === "bolster" ? [pad.insertDimensionsMm[1], pad.insertDimensionsMm[0]] : [...pad.insertDimensionsMm],
      finishedCoverDimensionsMm: [...coverDimensions],
      fitEvidence: { version: DUNELM_RANGE_VERSION, status: "pending", reference: pad.shape === "bolster" ? "Owner-authorised standard cylinder replacement, 2026-10-16: proposed diameter 190 mm x length 440 mm cover for diameter 200 mm x length 460 mm cylindrical pad. Modest 10 mm diameter / 20 mm length reduction proposed for fullness, not supplier-confirmed fit guidance; physical fit pending." : "Owner-proposed 20 mm smaller flat cover, 2026-10-16. Representative samples pending; not Dunelm-confirmed fit guidance." },
      costMinor: Math.round(pad.grossPriceMinor / 1.2), costBasisConfirmed: true,
      confirmed: false, approvalReference: "Product identity, filling and advertised price verified; physical fit remains pending.",
      sourcing: { ...DUNELM_INSERT_SOURCE, productId: pad.productId, productName: pad.productName,
        sourceUrl: pad.sourceUrl, advertisedSize: pad.advertisedSize, grossPriceMinor: pad.grossPriceMinor,
        fitStatus: "unconfirmed", skuVerified: true, supplierFillingDescription: pad.supplierFillingDescription,
        stockObservation: { status: pad.observedInStock ? "in-stock" : "out-of-stock", observedAt: pad.observedAt, reference: pad.sourceUrl },
      },
    } satisfies NonNullable<CushionPricingRules["compatibleInsertsBySize"]>[string]];
  }));

export const WILLOWS_INSERTS_BY_SIZE: NonNullable<CushionPricingRules["compatibleInsertsBySize"]> = Object.fromEntries(
  ([ ["round-40",400,450,"39462557516011",599], ["round-50",500,550,"39462564724971",699] ] as const).map(([coverSizeId,cover,pad,variant,price]) => {
    const sourceUrl = `https://willowsdirect.co.uk/products/single-hollowfibre-cushion-pads-inners-inserts-fillers-scatters?variant=${variant}`;
    return [coverSizeId, {
      fillingType: "hollowfibre", supplierSku: "", supplierVariantId: variant, coverSizeId,
      dimensionsMm: [pad], finishedCoverDimensionsMm: [cover],
      fitEvidence: { version: DUNELM_RANGE_VERSION, status: "pending", reference: "Owner-selected next-size-up pairing, 2026-10-16, following Willows general sizing guidance. Physical fit pending. https://willowsdirect.co.uk/products/set-of-1-10-hollow-fibre-cushion-scatter-inner-square-pads-35-40-45-50cm" },
      // Use the full advertised outlay for planning. Do not invent reclaimable input VAT.
      costMinor: price, costBasisConfirmed: false, confirmed: false,
      approvalReference: "Exact standard Round variant and advertised price verified. Physical fit and supplier VAT basis/invoice require confirmation.",
      sourcing: { supplier: "Willows Direct",productId:"6636313903339",productName:"Single - Hollowfibre Cushion Pads Inners Inserts Fillers Scatters",
        sourceUrl,checkedOn:"2026-10-16",currency:"GBP",priceBasis:"Advertised retail outlay; input VAT deduction unverified",vatBasisPoints:null,
        termsUrl:"https://willowsdirect.co.uk/policies/terms-of-service",procurementNote:"Confirm VAT invoice and applicable order-level delivery. No stock reservation implied.",
        advertisedSize:`Round ${pad/10} cm`,grossPriceMinor:price,fitStatus:"unconfirmed",skuVerified:false,
        supplierFillingDescription:"Hollowfibre polyester insert",stockObservation:{status:"in-stock",observedAt:"2026-10-16",reference:sourceUrl},
      },
    } satisfies NonNullable<CushionPricingRules["compatibleInsertsBySize"]>[string]];
  }));
export const STANDARD_INSERTS_BY_SIZE = { ...DUNELM_INSERTS_BY_SIZE, ...WILLOWS_INSERTS_BY_SIZE };

/** Historical source associations for specs without rangeVersion; never silently remap these. */
export const LEGACY_DUNELM_INSERTS_BY_SIZE: NonNullable<CushionPricingRules["compatibleInsertsBySize"]> =
  Object.fromEntries(([ ["square-45", "30287925", [450,450]], ["bed-square-70", "30678641", [700,700]] ] as const)
    .map(([coverSizeId, sku, coverDimensions]) => {
      const pad = DUNELM_STANDARD_INSERT_CANDIDATES.find(row => row.supplierSku === sku)!;
      return [coverSizeId, {
        fillingType: "hollowfibre",
        supplierSku: sku,
        coverSizeId,
        dimensionsMm: [...pad.insertDimensionsMm],
        finishedCoverDimensionsMm: [...coverDimensions],
        fitEvidence: { version: DUNELM_RANGE_VERSION, status: "pending", reference: DUNELM_RANGE_GAPS.fit },
        costMinor: Math.round(pad.grossPriceMinor / 1.2),
        confirmed: false,
        approvalReference: "Supplier variant and cost verified. Matching advertised dimensions alone do not confirm cover fit.",
        sourcing: {
          ...DUNELM_INSERT_SOURCE,
          productId: pad.productId, productName: pad.productName, sourceUrl: pad.sourceUrl,
          advertisedSize: pad.advertisedSize, grossPriceMinor: pad.grossPriceMinor,
          fitStatus: "unconfirmed", skuVerified: true,
          supplierFillingDescription: pad.supplierFillingDescription,
          stockObservation: { status: pad.observedInStock ? "in-stock" : "out-of-stock", observedAt: pad.observedAt, reference: pad.sourceUrl },
        },
      } satisfies NonNullable<CushionPricingRules["compatibleInsertsBySize"]>[string]];
    }));
