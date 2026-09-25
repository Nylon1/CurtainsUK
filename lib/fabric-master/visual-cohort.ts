type Identity = { fabric_id: string; supplier_id: string; brand_id: string; design_id: string };
const designKey = (row: Identity) => `${row.supplier_id}|${row.brand_id}|${row.design_id}`;

/** Restrict inference to an explicit, completely reconciled canonical cohort. */
export function selectVisualCohort<T extends Identity, D extends T>(ids: unknown, colours: T[], designs: D[]) {
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 500 || new Set(ids).size !== ids.length || ids.some(id => typeof id !== "string" || !/^[a-z0-9-]{1,150}$/.test(id))) throw new Error("VISUAL_COHORT_INVALID");
  const selected = colours.filter(row => ids.includes(row.fabric_id));
  if (selected.length !== ids.length || new Set(selected.map(row => row.fabric_id)).size !== ids.length) throw new Error("VISUAL_COHORT_IMAGE_COVERAGE_INCOMPLETE");
  const keys = new Set(selected.map(designKey));
  const selectedDesigns = [...keys].map(key => {
    const representatives = designs.filter(row => designKey(row) === key);
    if (representatives.length !== 1) throw new Error("VISUAL_COHORT_DESIGN_AMBIGUOUS");
    // The canonical design representative may be a sibling outside this batch.
    // Bind the same governed design to an approved image inside the selected cohort.
    const representative = representatives[0];
    const scopedImage = selected.find(row => row.fabric_id === representative.fabric_id) ?? selected.find(row => designKey(row) === key)!;
    return { ...representative, ...scopedImage };
  });
  const singles = [...keys].filter(key => selected.filter(row => designKey(row) === key).length === 1).length;
  return { colours: selected, designs: selectedDesigns, singles };
}
