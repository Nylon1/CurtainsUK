import { fingerprintHash } from './engine';

export const supplierColourPolicy = 'supplier-colour-terminology-v1';
export const supplierColourFamilies = [
  'white',
  'cream',
  'beige',
  'taupe',
  'brown',
  'grey',
  'black',
  'blue',
  'green',
  'red',
  'pink',
  'purple',
  'orange',
  'yellow',
  'gold',
] as const;
type Family = (typeof supplierColourFamilies)[number];
/** Closed lexical rules, not visual truth. Material/place/poetic names intentionally absent. */
const shades: Record<string, readonly Family[]> = {
  navy: ['blue'],
  'navy blue': ['blue'],
  indigo: ['blue'],
  cobalt: ['blue'],
  'cobalt blue': ['blue'],
  teal: ['blue', 'green'],
  turquoise: ['blue', 'green'],
  aqua: ['blue', 'green'],
  sage: ['green'],
  'sage green': ['green'],
  olive: ['green'],
  'olive green': ['green'],
  emerald: ['green'],
  ivory: ['cream'],
  blush: ['pink'],
  'blush pink': ['pink'],
  ochre: ['yellow', 'gold'],
  mustard: ['yellow', 'gold'],
  charcoal: ['grey'],
  silver: ['grey'],
  burgundy: ['red'],
  maroon: ['red'],
  scarlet: ['red'],
  lilac: ['purple'],
  violet: ['purple'],
  mauve: ['purple'],
  'mineral blue': ['blue'],
  'botanical green': ['green'],
};
const normal = (v: string) => v.trim().toLowerCase().replace(/\s+/g, ' ');
const sorted = (v: readonly Family[]) => [...new Set(v)].sort() as Family[];
function term(value: string): Family[] | null {
  if (supplierColourFamilies.includes(value as Family)) return [value as Family];
  if (value === 'gray') return ['grey'];
  if (Object.hasOwn(shades, value)) return [...shades[value]!];
  // Modifiers describe the shade, but this layer ONLY derives family, never the axis itself.
  const match = /^(?:light|dark|deep|pale|soft|dusty|muted) (.+)$/.exec(value);
  return match ? termWithoutModifier(match[1]!) : null;
}
function termWithoutModifier(value: string): Family[] | null {
  if (supplierColourFamilies.includes(value as Family)) return [value as Family];
  return Object.hasOwn(shades, value) ? [...shades[value]!] : null;
}
export function normaliseSupplierColourName(input: unknown) {
  if (typeof input !== 'string' || input.length > 2000)
    throw new Error('Invalid supplier colour name');
  const name = normal(input);
  const parts = name.split(/\s*(?:\/|&|\+|,|\band\b)\s*/);
  const mapped = parts.map(term);
  const unresolved = parts.filter((_, i) => !mapped[i]);
  const families = unresolved.length ? [] : sorted(mapped.flatMap((f) => f ?? []));
  return {
    original: input,
    normalized: name,
    families,
    unresolved,
    primaryFamily: families.length === 1 ? families[0]! : null,
    state: families.length ? ('known' as const) : ('unknown' as const),
  };
}
/** The adapter supplies already-governed tags. No payload-supplied authority can escalate this output. */
export function normaliseSupplierColourEvidence(input: {
  fabricId: string;
  sku: string;
  sourceDigest: string;
  sourceReference: string;
  name: string;
  governedTags: string[];
}) {
  for (const k of ['fabricId', 'sku', 'sourceDigest', 'sourceReference'] as const)
    if (typeof input[k] !== 'string' || !input[k].trim() || input[k].length > 2000)
      throw new Error('Invalid colour evidence identity');
  if (!Array.isArray(input.governedTags) || input.governedTags.length > 100)
    throw new Error('Invalid colour tags');
  const name = normaliseSupplierColourName(input.name);
  const tags = input.governedTags
    .map(normaliseSupplierColourName)
    .sort((a, b) => {
      const left = `${a.normalized}\u0000${a.original}`;
      const right = `${b.normalized}\u0000${b.original}`;
      return left < right ? -1 : left > right ? 1 : 0;
    });
  const structured = sorted(tags.flatMap((t) => t.families));
  const conflict =
    structured.length > 0 &&
    name.families.length > 0 &&
    !name.families.some((f) => structured.includes(f));
  const families = conflict ? [] : structured.length ? structured : name.families;
  const unresolvedTags = tags.filter((t) => t.state === 'unknown').map((t) => t.original);
  const body = {
    policy: supplierColourPolicy,
    fabricId: input.fabricId,
    sku: input.sku,
    sourceDigest: input.sourceDigest,
    sourceReference: input.sourceReference,
    authority: 'classified' as const,
    name,
    structuredFamilies: structured,
    unresolvedTags,
    families,
    primaryFamily: families.length === 1 && !unresolvedTags.length ? families[0]! : null,
    status: conflict ? 'review-conflict' : families.length ? 'known' : 'unknown',
    provenance: {
      nameField: 'colour_name',
      tagField: 'fabric_retail_profiles.colour_families',
      governedTags: tags.map((t) => t.original),
    },
  };
  return structuredClone({ ...body, digest: fingerprintHash(body) });
}
