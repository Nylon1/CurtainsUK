import type { FabricMasterRecord } from './types';
import { RETAIL_TAXONOMY, type RetailProfile } from './retail';

/** Presentation registry only. Activation requires a governed, catalogue-wide coverage gate.
 * Sparse editorial profiles are useful on exact detail pages, not complete catalogue facets.
 * Future enrichment must supply approved values through these existing canonical dimensions.
 */
export const BROWSE_DISCOVERY = [
  { key: 'colour', label: 'Colour / palette', treatment: 'swatches', active: false },
  { key: 'pattern', label: 'Pattern character', treatment: 'fabric-images', active: false },
  { key: 'patternStrength', label: 'Pattern strength', treatment: 'continuum', active: false },
  { key: 'texture', label: 'Texture', treatment: 'fabric-images', active: false },
  { key: 'character', label: 'Fabric character', treatment: 'fabric-images', active: false },
  { key: 'designStrength', label: 'Design strength', treatment: 'continuum', active: false },
  { key: 'visualWeight', label: 'Visual weight', treatment: 'continuum', active: false },
] as const;

export type EvidenceProfile = RetailProfile & { classification_evidence?: string | null };
const known = (values: string[], allowed: string[]) => [...new Set(values)].filter(v => v !== 'UNKNOWN' && allowed.includes(v));

export function reviewedFabricIntelligence(profile: EvidenceProfile | undefined, approvedImageHashes: string[]) {
  if (!profile?.description_validated || !profile.classification_evidence) return null;
  try {
    const evidence = JSON.parse(profile.classification_evidence);
    if (!['PT_EDITORIAL_5G_1', 'PT_EDITORIAL_5H_1'].includes(evidence.ruleVersion)
      || typeof evidence.reviewer !== 'string' || !evidence.reviewer.trim()
      || !/^[a-f0-9]{64}$/.test(evidence.sourceHash) || !/^[a-f0-9]{64}$/.test(evidence.ruleHash)
      || !Number.isFinite(Date.parse(evidence.sourceCheckedAt))
      || !approvedImageHashes.includes(evidence.imageHash)) return null;
    const colour = known(profile.colour_families, RETAIL_TAXONOMY.colour);
    const pattern = known(profile.patterns, RETAIL_TAXONOMY.pattern);
    const character = known(profile.characters, RETAIL_TAXONOMY.character);
    const style = known(profile.styles, RETAIL_TAXONOMY.style);
    // Do not imply primary/secondary/accent roles, physical weight, scale or strength from these arrays.
    const dimensions = [
      { key: 'colour', label: 'Colour family', values: colour },
      { key: 'pattern', label: 'Pattern character', values: pattern },
      { key: 'texture', label: 'Texture & surface', values: character.filter(v => ['smooth','textured','velvet','linen-look'].includes(v)) },
      { key: 'finish', label: 'Finish', values: character.filter(v => ['matte','sheen'].includes(v)) },
      { key: 'character', label: 'Fabric character', values: [...character.filter(v => !['smooth','textured','velvet','linen-look','matte','sheen'].includes(v)), ...style] },
    ].filter(d => d.values.length);
    if (!dimensions.length) return null;
    const patterned = pattern.some(v => !['plain','textured plain'].includes(v));
    const textured = character.includes('textured') || pattern.includes('textured plain');
    // Conditional design advice, not new observations or claims about suitability/physical performance.
    const advice = [
      ...(patterned ? [{ label: 'Space', text: 'Consider the pattern across the whole curtain area, not just a small sample. More fabric gives its rhythm more presence.' }] : []),
      ...(textured ? [{ label: 'Light', text: 'Look at the surface in daylight and evening light. Side lighting can bring texture forward; a sample helps you judge it in your room.' }] : []),
      ...(colour.length ? [{ label: 'Colour relationship', text: 'Compare this colour family with your room’s main and supporting colours. A close relationship can feel quieter; a more distant one gives the curtains greater presence.' }] : []),
      ...(patterned ? [{ label: 'What works', text: 'Let the pattern lead when surrounding surfaces are quieter. Repeat a colour already in the room to help connect the two.' }] : textured ? [{ label: 'What works', text: 'Use texture to introduce depth while keeping the pattern relationship restrained.' }] : []),
      ...(patterned ? [{ label: 'What needs care', text: 'Several strong patterns can compete. Compare their scale and contrast together before committing to a large curtain area.' }] : []),
    ];
    return { evidenceClass: 'GOVERNED_EDITORIAL_EVIDENCE' as const, dimensions, advice };
  } catch { return null; }
}

export function supplierFacts(record: FabricMasterRecord) {
  const facts: { label: string; value: string }[] = [];
  const add = (label: string, value: string | null | undefined) => { if (value?.trim() && value !== 'UNKNOWN') facts.push({ label, value }); };
  const cm = (n: number | null) => n !== null && Number.isFinite(n) && n >= 0 ? `${n / 10} cm` : null;
  add('Supplier', record.supplier_name); add('Brand', record.brand_name); add('Collection', record.collection_name);
  add('Design', record.design_name); add('Colourway', record.colour_name); add('SKU', record.supplier_sku);
  if (record.composition.length && record.composition.every(p => p.percentage > 0 && p.material.trim())
    && Math.abs(record.composition.reduce((sum,p) => sum + p.percentage,0)-100) < 0.01)
    add('Composition', record.composition.map(p => `${p.percentage}% ${p.material}`).join(', '));
  if (record.full_width_mm && record.full_width_mm > 0) add('Full width', cm(record.full_width_mm));
  if (record.usable_width_mm && record.usable_width_mm > 0) add('Usable width', cm(record.usable_width_mm));
  add('Vertical repeat', cm(record.vertical_repeat_mm)); add('Horizontal repeat', cm(record.horizontal_repeat_mm));
  add('Pattern match', record.pattern_match_type?.replaceAll('_',' ').toLowerCase());
  if (record.weight_gsm && record.weight_gsm > 0) add('Physical weight', `${record.weight_gsm} g/m²`);
  add('Care', record.care_instructions.filter(v => v !== 'UNKNOWN').join(', '));
  add('Supplier-listed uses', record.usage_suitability.filter(v => v !== 'UNKNOWN').join(', '));
  return { evidenceClass: 'MANUFACTURER_FACT' as const, facts };
}
