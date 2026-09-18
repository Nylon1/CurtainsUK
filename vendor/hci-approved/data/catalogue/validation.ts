import {
  colourArchetypes,
  curtainHeadings,
  fabricBehaviourClasses,
} from '../knowledge/curtain-knowledge';
import { designCharacterValues, patternIds } from '../knowledge/types';

export const formerlyRequiredCatalogueFields = [
  'active',
  'sampleAvailable',
  'behaviourClass',
  'patternClass',
  'colourFamily',
  'careClass',
  'blackoutCapability',
  'priceBand',
] as const;
export const requiredCatalogueFields: readonly string[] = [];
export const catalogueFieldNames = [
  'designCharacter',
  ...formerlyRequiredCatalogueFields,
  'curtainUse',
  'colourArchetypeId',
  'colourTemperature',
  'colourLightness',
  'colourSaturation',
  'surface',
  'sheen',
  'drape',
  'weightGsm',
  'usableWidthCm',
  'patternRepeatCm',
  'composition',
  'headingCompatibility',
] as const;
export type CatalogueField = (typeof catalogueFieldNames)[number];
export const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
export const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
export const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
export const isMachineId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-z0-9][a-z0-9._:-]*$/.test(value);

const enums: Partial<Record<CatalogueField, readonly string[]>> = {
  curtainUse: ['ordinary-curtain', 'specialist-curtain', 'other-textile', 'catalogue-fabric'],
  behaviourClass: fabricBehaviourClasses.map((x) => x.id),
  patternClass: patternIds,
  colourArchetypeId: colourArchetypes.map((x) => x.id),
  colourTemperature: ['warm', 'cool', 'balanced'],
  colourLightness: ['light', 'mid-tone', 'deep'],
  colourSaturation: ['muted', 'balanced', 'saturated'],
  surface: ['smooth', 'subtle-texture', 'visible-weave', 'pile', 'relief'],
  sheen: ['matte', 'low', 'gentle', 'lustrous'],
  drape: ['fluid', 'soft', 'balanced', 'structured'],
  careClass: ['easy-care', 'specialist-cleaning', 'unknown'],
  blackoutCapability: ['integrated', 'lining-supported', 'none', 'unknown'],
  priceBand: ['value', 'mid', 'premium', 'unknown'],
};

/** JSON-like, closed catalogue schema. No coercion, including for unknown-authority values. */
export function validateCatalogueValue(field: string, value: unknown): string[] {
  if (field === 'designCharacter')
    return Array.isArray(value) &&
      value.length > 0 &&
      value.length <= designCharacterValues.length &&
      new Set(value).size === value.length &&
      value.every(
        (v) => typeof v === 'string' && (designCharacterValues as readonly string[]).includes(v),
      )
      ? []
      : ['Invalid design character set'];
  if (!(catalogueFieldNames as readonly string[]).includes(field))
    return [`Unknown catalogue field: ${field}`];
  const choices = enums[field as CatalogueField];
  if (choices)
    return typeof value === 'string' && choices.includes(value) ? [] : [`Invalid ${field}`];
  if (field === 'active' || field === 'sampleAvailable')
    return typeof value === 'boolean' ? [] : [`${field} must be boolean`];
  if (field === 'colourFamily') return isText(value) ? [] : ['colourFamily must be nonempty text'];
  if (['weightGsm', 'usableWidthCm', 'patternRepeatCm'].includes(field)) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0
      ? []
      : [`${field} must be positive and finite`];
  }
  if (field === 'headingCompatibility') {
    return Array.isArray(value) &&
      value.every((x) => curtainHeadings.some((h) => h.id === x)) &&
      new Set(value).size === value.length
      ? []
      : ['Invalid headingCompatibility'];
  }
  if (field === 'composition') {
    if (!Array.isArray(value) || !value.length) return ['composition must be a nonempty array'];
    const fibres = new Set<string>();
    let total = 0;
    for (const item of value) {
      if (
        !isObject(item) ||
        Object.keys(item).some((k) => !['fibre', 'proportion'].includes(k)) ||
        !isText(item.fibre) ||
        typeof item.proportion !== 'number' ||
        !Number.isFinite(item.proportion) ||
        item.proportion <= 0 ||
        item.proportion > 1
      )
        return ['composition requires fibre text and positive numeric proportions that total 1'];
      // Fibre spelling is exact; surrounding whitespace is rejected, never silently corrected.
      if (item.fibre !== item.fibre.trim() || fibres.has(item.fibre))
        return ['composition fibre names must be trimmed and unique'];
      fibres.add(item.fibre);
      total += item.proportion;
    }
    return Math.abs(total - 1) <= 0.001 ? [] : ['composition proportions must total 1'];
  }
  return [`Unsupported catalogue field: ${field}`];
}

export function validateSourceValue(field: string, value: unknown, review = false): string[] {
  if (!isObject(value)) return [`${field} must be a source assertion`];
  const errors = validateCatalogueValue(field, value.value);
  if (!isText(value.field)) errors.push(`${field} requires a source field`);
  if (Object.keys(value).some((k) => !['value', 'field', 'authority', 'note'].includes(k)))
    errors.push(`${field} contains unsupported assertion properties`);
  if (value.note !== undefined && !isText(value.note)) errors.push(`${field} note must be text`);
  const permitted = review
    ? ['classified', 'verified']
    : ['source-provided', 'classified', 'verified'];
  if (
    (review || value.authority !== undefined) &&
    (typeof value.authority !== 'string' || !permitted.includes(value.authority))
  )
    errors.push(
      `${field} ${review ? 'manual review authority must be classified or verified' : 'invalid authority'}`,
    );
  return errors;
}

/** Order-independent comparison only for the supported set-valued fields; no generic JSON hashing. */
export function normalizeCatalogueValue(field: CatalogueField, value: unknown): unknown {
  if (field === 'composition')
    return (value as { fibre: string; proportion: number }[])
      .map((x) => ({ fibre: x.fibre, proportion: x.proportion }))
      .sort((a, b) => compareText(a.fibre, b.fibre));
  if (field === 'headingCompatibility' || field === 'designCharacter')
    return [...(value as string[])].sort(compareText);
  return value;
}

export function equalCatalogueValues(field: CatalogueField, a: unknown, b: unknown): boolean {
  const left = normalizeCatalogueValue(field, a),
    right = normalizeCatalogueValue(field, b);
  if (field === 'composition') {
    const x = left as { fibre: string; proportion: number }[],
      y = right as typeof x;
    return (
      x.length === y.length &&
      x.every((item, i) => item.fibre === y[i]!.fibre && item.proportion === y[i]!.proportion)
    );
  }
  if (field === 'headingCompatibility' || field === 'designCharacter')
    return (
      (left as string[]).length === (right as string[]).length &&
      (left as string[]).every((x, i) => x === (right as string[])[i])
    );
  return left === right;
}
