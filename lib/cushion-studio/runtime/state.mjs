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
