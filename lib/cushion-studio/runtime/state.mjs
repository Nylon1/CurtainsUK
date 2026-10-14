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
