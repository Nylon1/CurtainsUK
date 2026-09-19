import type { FabricMasterRecord } from './types';

export function supplierFacts(record: FabricMasterRecord) {
  const facts: { label: string; value: string }[] = [];
  const add = (label: string, value: string | null | undefined) => { if (value?.trim() && value.toUpperCase() !== 'UNKNOWN') facts.push({ label, value }); };
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
