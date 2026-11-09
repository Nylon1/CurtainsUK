import type { RomanQuote } from '../roman-blind/pricing';

/** Check the total cloth for products sharing a Roman blind fabric. */
export async function combinedRomanStockAvailable(input: {
  curtains: ReadonlyMap<string, number>;
  cushions: ReadonlyMap<string, number>;
  romans: readonly RomanQuote[];
  curtainStock: (fabricId: string, metres: number) => Promise<boolean>;
  romanStock: (supplierId: string, supplierSku: string, metres: number) => Promise<boolean>;
}): Promise<boolean> {
  const groups = new Map<string, RomanQuote[]>();
  for (const roman of input.romans) {
    const group = groups.get(roman.spec.fabricId) ?? [];
    group.push(roman);
    groups.set(roman.spec.fabricId, group);
  }
  for (const [fabricId, group] of groups) {
    const curtainMetres = input.curtains.get(fabricId) ?? 0;
    const cushionMetres = input.cushions.get(fabricId) ?? 0;
    if (!Number.isFinite(curtainMetres) || curtainMetres < 0 || !Number.isFinite(cushionMetres) || cushionMetres < 0) return false;
    if (group.length === 1 && curtainMetres === 0 && cushionMetres === 0) continue;
    const first = group[0];
    if (!first.fabricSupplierId || !first.fabricSupplierSku || group.some(roman =>
      roman.fabricSupplierId !== first.fabricSupplierId ||
      roman.fabricSupplierSku !== first.fabricSupplierSku ||
      roman.fabricMetres === null || !Number.isFinite(roman.fabricMetres) || roman.fabricMetres <= 0)) return false;
    const metres = curtainMetres + cushionMetres + group.reduce((sum, roman) => sum + roman.fabricMetres!, 0);
    if (!Number.isFinite(metres) || metres <= 0) return false;
    try {
      const available = curtainMetres > 0
        ? await input.curtainStock(fabricId, metres)
        : await input.romanStock(first.fabricSupplierId, first.fabricSupplierSku, metres);
      if (!available) return false;
    } catch { return false; }
  }
  return true;
}
