import { CUSHION_ACTIVE_SIZE_IDS, SHAPED_CONSTRUCTION_VERSION, sizeOf } from "./geometry.mjs";

/** An explicit customer choice only. Restored specifications never pass here. */
export function selectRangeSize(spec, sizeId) {
  if (!CUSHION_ACTIVE_SIZE_IDS.includes(sizeId)) return false;
  spec.sizeId = sizeId;
  spec.rangeVersion = "standard-inserts-v1";
  spec.manufacturingProfile = "flat-sewn-v1";
  const shape = sizeOf(sizeId).shape;
  if (shape === "square") delete spec.constructionProfile;
  else spec.constructionProfile = SHAPED_CONSTRUCTION_VERSION;
  if (spec.filling === "filled") selectFilling(spec, "filled");
  return true;
}

export function selectFilling(spec, value) {
  if (value !== "cover" && value !== "filled") return;
  if (value === "filled" && spec.sizeId === "bolster-23-56") return;
  spec.rangeVersion = "standard-inserts-v1";
  spec.filling = value;
  if (value === "filled") spec.fillingType = "polyester";
  else delete spec.fillingType;
}
export function fillingLabel(spec) {
  return spec.filling === "cover" ? "Cover only"
    : spec.fillingType === "polyester" ? "Cover & standard synthetic insert"
    : spec.fillingType === "hollowfibre" ? "Cover & hollowfibre insert"
      : "Cover & filling (type unconfirmed)";
}
/** Factual customer projection only. Never infer pad dimensions from the cover. */
export function insertSpecificationLabel(spec, evidence) {
  if (spec?.filling !== "filled") return "";
  if (!evidence) return "Supplier insert details and compatible fit await confirmation.";
  const dimensions = (values) => {
    if (!Array.isArray(values) || !values.length || values.some((n) => !Number.isFinite(n) || n <= 0)) return null;
    if (values.length === 2 && (evidence.shape === "bolster" || sizeOf(spec.sizeId).shape === "bolster"))
      return `diameter ${values[0] / 10} cm, length ${values[1] / 10} cm`;
    return `${values.length === 1 ? "Ø" : ""}${values.map((n) => n / 10).join(" × ")} cm`;
  };
  const pad = dimensions(evidence.padDimensionsMm);
  const cover = dimensions(evidence.finishedCoverDimensionsMm);
  const parts = [evidence.supplier, evidence.productName, evidence.description]
    .filter((value) => typeof value === "string" && value.trim());
  if (pad) parts.push(`Pad: ${pad}`);
  if (cover) parts.push(`Finished cover: ${cover}`);
  parts.push(evidence.fitStatus === "confirmed" ? "Recorded fit confirmed" : "Proposed pairing: fit confirmation pending");
  return parts.join(". ") + ".";
}
/** Undo includes persistence identity and workflow context, not only visible product fields. */
export function historySnapshot(
  design,
  { revision = 0, selectedId = null, mode = "configurator" } = {},
) {
  return structuredClone({ design, revision, selectedId, mode });
}
export function restoreHistory(snapshot, knownRevisions = new Map()) {
  const result = structuredClone(snapshot);
  result.revision = Math.max(
    result.revision || 0,
    knownRevisions.get(result.design.id) || 0,
  );
  if (!result.design.pieces.some((p) => p.spec.id === result.selectedId))
    result.selectedId = result.design.pieces[0]?.spec.id || null;
  return result;
}

/** A display preference only: never attach this state to a saved or quoted spec. */
export function defaultVisualFill(spec) {
  return spec?.sizeId === "square-50" ? "soft-fullness" : "baseline";
}
export function createVisualFillTrial() {
  const overrides = new Map();
  const key = (spec) => `${spec?.id}:${spec?.sizeId}`;
  const resolve = (spec) => overrides.get(key(spec)) || defaultVisualFill(spec);
  return {
    resolve,
    choose(spec, variant) {
      if (spec?.id && ["baseline", "soft-fullness"].includes(variant))
        overrides.set(key(spec), variant);
    },
    forDesign(design) {
      return Object.fromEntries(
        design.pieces.map(({ spec }) => [spec.id, resolve(spec)]),
      );
    },
  };
}
