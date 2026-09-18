import { fingerprintHash } from '../fingerprint/engine';
import { supplierColourFamilies } from '../fingerprint/supplier-colour';
import type { ColourObservation } from '../matching/colour-relationship';

export const referenceTypes = [
  'room',
  'paint',
  'sofa-upholstery',
  'wallpaper',
  'rug',
  'flooring',
  'existing-fabric',
  'moodboard',
] as const;
export type ReferenceType = (typeof referenceTypes)[number];
// Reuse HCI's vocabulary only, never supplier assertions or authority.
export const colourFamilies = supplierColourFamilies;
export type ColourFamily = (typeof colourFamilies)[number];
export const extractionSchemaVersion = 'hci-reference-colour-design-v1';
export const observationModel = 'srgb-visible-pixel-statistics-v1';
export interface Observation {
  primaryColourFamily: ColourFamily | 'UNKNOWN';
  secondaryColourFamilies: ColourFamily[];
  accentColours: ColourFamily[];
  temperature: 'warm' | 'cool' | 'neutral' | 'UNKNOWN';
  lightness: 'light' | 'mid' | 'dark' | 'UNKNOWN';
  saturation: 'muted' | 'balanced' | 'rich' | 'UNKNOWN';
  contrast: 'low' | 'medium' | 'high' | 'UNKNOWN';
  patternActivity: 'plain' | 'low' | 'medium' | 'high' | 'UNKNOWN';
}
const fields = {
  primaryColourFamily: [...colourFamilies, 'UNKNOWN'],
  temperature: ['warm', 'cool', 'neutral', 'UNKNOWN'],
  lightness: ['light', 'mid', 'dark', 'UNKNOWN'],
  saturation: ['muted', 'balanced', 'rich', 'UNKNOWN'],
  contrast: ['low', 'medium', 'high', 'UNKNOWN'],
  patternActivity: ['plain', 'low', 'medium', 'high', 'UNKNOWN'],
};
/** Closed output schema: no captions, instructions, inferred products or manufacturer facts. */
export function validateObservation(value: unknown): Observation {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('INVALID_OBSERVATION');
  const v = value as Record<string, unknown>;
  const keys = [...Object.keys(fields), 'secondaryColourFamilies', 'accentColours'];
  if (Object.keys(v).length !== keys.length || Object.keys(v).some((k) => !keys.includes(k)))
    throw new Error('INVALID_OBSERVATION');
  for (const [key, allowed] of Object.entries(fields))
    if (!allowed.includes(v[key] as string)) throw new Error('INVALID_OBSERVATION');
  for (const key of ['secondaryColourFamilies', 'accentColours']) {
    const a = v[key];
    if (
      !Array.isArray(a) ||
      a.length > 4 ||
      new Set(a).size !== a.length ||
      a.some((x) => !colourFamilies.includes(x))
    )
      throw new Error('INVALID_OBSERVATION');
  }
  const all = [...(v.secondaryColourFamilies as string[]), ...(v.accentColours as string[])];
  if (new Set(all).size !== all.length || all.includes(v.primaryColourFamily as string))
    throw new Error('INVALID_OBSERVATION');
  return structuredClone(value) as Observation;
}
export interface ReferenceProvenance {
  consultationId: string;
  imageHash: string;
  modelVersion: string;
}
/** Context evidence, NOT customer taste, supplier facts, or a recommendation command. */
export function standardizeReference(observation: unknown, provenance: ReferenceProvenance) {
  if (
    !provenance.consultationId ||
    !/^sha256:[a-f0-9]{64}$/.test(provenance.imageHash) ||
    !provenance.modelVersion
  )
    throw new Error('INVALID_PROVENANCE');
  const attributes = validateObservation(observation);
  const evidenceRefs = [
    `${extractionSchemaVersion}:${provenance.consultationId}:${provenance.imageHash}:${provenance.modelVersion}`,
  ];
  const colourContext: ColourObservation = {
    families: [
      ...new Set([
        ...(attributes.primaryColourFamily === 'UNKNOWN' ? [] : [attributes.primaryColourFamily]),
        ...attributes.secondaryColourFamilies,
        ...attributes.accentColours,
      ]),
    ],
    evidenceRefs,
    attributes: {
      ...(attributes.temperature === 'UNKNOWN'
        ? {}
        : { temperature: { value: attributes.temperature, evidenceRefs } }),
      ...(attributes.lightness === 'UNKNOWN'
        ? {}
        : { lightness: { value: attributes.lightness, evidenceRefs } }),
      ...(attributes.saturation === 'UNKNOWN'
        ? {}
        : {
            saturation: {
              value:
                attributes.saturation === 'rich' ? ('saturated' as const) : attributes.saturation,
              evidenceRefs,
            },
          }),
    },
  };
  const body = {
    extractionSchemaVersion,
    provenance: {
      consultationId: provenance.consultationId,
      imageHash: provenance.imageHash,
      modelVersion: provenance.modelVersion,
    },
    source: 'customer-reference-image' as const,
    evidenceRole: 'observed-design-context' as const,
    status: 'inferred' as const,
    attributes,
    colourContext,
    limitations: [
      'Approximate visible colour; lighting, camera and crop affect results.',
      'Not a customer preference or a manufacturer fact.',
      'Pattern semantics require separate validation.',
    ],
  };
  return { ...body, outputDigest: fingerprintHash(body) };
}

/** Pure bounded sRGB observation. No object recognition, OCR, material or room inference. */
export function observePixels(rgba: Uint8Array): Observation {
  if (!rgba.length || rgba.length % 4 || rgba.length > 256 * 256 * 4)
    throw new Error('INVALID_PIXELS');
  const counts = new Map<ColourFamily, number>();
  const luminances: number[] = [];
  let chroma = 0;
  let warm = 0;
  let cool = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3]! < 240) continue; // transparent pixels are not visible design evidence
    const r = rgba[i]! / 255,
      g = rgba[i + 1]! / 255,
      b = rgba[i + 2]! / 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      d = max - min;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    let h =
      d === 0
        ? 0
        : max === r
          ? ((g - b) / d + 6) % 6
          : max === g
            ? (b - r) / d + 2
            : (r - g) / d + 4;
    h *= 60;
    let family: ColourFamily;
    if (max < 0.12) family = 'black';
    else if (d < 0.08) family = lum > 0.85 ? 'white' : 'grey';
    else if (h < 65 && h >= 15 && lum < 0.42) family = 'brown';
    else if (h < 65 && h >= 15 && d < 0.28) family = lum > 0.85 ? 'cream' : 'beige';
    else if (h < 15 || h >= 345) family = lum > 0.5 ? 'pink' : 'red';
    else if (h < 45) family = 'orange';
    else if (h < 70) family = 'yellow';
    else if (h < 170) family = 'green';
    else if (h < 265) family = 'blue';
    else if (h < 315) family = 'purple';
    else family = 'pink';
    counts.set(family, (counts.get(family) ?? 0) + 1);
    luminances.push(lum);
    chroma += d;
    if (d >= 0.08) {
      if (h < 70 || h >= 315) warm++;
      else cool++;
    }
  }
  const empty: Observation = {
    primaryColourFamily: 'UNKNOWN',
    secondaryColourFamilies: [],
    accentColours: [],
    temperature: 'UNKNOWN',
    lightness: 'UNKNOWN',
    saturation: 'UNKNOWN',
    contrast: 'UNKNOWN',
    patternActivity: 'UNKNOWN',
  };
  if (luminances.length < 64) return empty;
  const total = luminances.length;
  const ranked = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const mean = luminances.reduce((a, b) => a + b, 0) / total;
  luminances.sort((a, b) => a - b);
  const spread = luminances[Math.floor(total * 0.95)]! - luminances[Math.floor(total * 0.05)]!;
  return {
    primaryColourFamily: ranked[0]![0],
    secondaryColourFamilies: ranked
      .slice(1)
      .filter(([, n]) => n / total >= 0.15)
      .slice(0, 4)
      .map(([c]) => c),
    accentColours: ranked
      .slice(1)
      .filter(([, n]) => n / total >= 0.03 && n / total < 0.15)
      .slice(0, 4)
      .map(([c]) => c),
    temperature: Math.abs(warm - cool) / total < 0.15 ? 'neutral' : warm > cool ? 'warm' : 'cool',
    lightness: mean < 0.3 ? 'dark' : mean > 0.7 ? 'light' : 'mid',
    saturation: chroma / total < 0.15 ? 'muted' : chroma / total > 0.5 ? 'rich' : 'balanced',
    contrast: spread < 0.2 ? 'low' : spread > 0.5 ? 'high' : 'medium',
    patternActivity: 'UNKNOWN',
  };
}
