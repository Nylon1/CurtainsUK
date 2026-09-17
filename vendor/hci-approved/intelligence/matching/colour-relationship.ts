import type { FabricMatchScore } from '../../data/catalogue/types';
import { supplierColourFamilies } from '../fingerprint/supplier-colour';
import { fingerprintHash } from '../fingerprint/engine';
import { compareRecommendationCandidates } from './recommendation-policy';
import {
  validateRoomColourContext,
  type ConfirmedRoomColourContext,
} from '../reference-images/room-context';

export const colourRelationshipPolicy = 'designer-colour-relationship-v1';
export const colourRelationshipOrdering = 'equal-utility-colour-relationship-v1';
export const colourAdvicePolicy = 'designer-colour-options-v1';
export const relationshipIntents = [
  'tonal',
  'complementary',
  'analogous',
  'contrast',
  'neutralise',
  'accent',
  'advise-me',
] as const;
type Family = (typeof supplierColourFamilies)[number];
export type ColourIntent = (typeof relationshipIntents)[number];
const attributeVocabulary = {
  temperature: ['warm', 'cool', 'neutral'],
  lightness: ['light', 'mid', 'dark', 'mixed'],
  intensity: ['muted', 'rich'],
  saturation: ['muted', 'balanced', 'saturated', 'mixed'],
  character: ['earthy', 'jewel', 'pastel'],
} as const;
type AttributeName = keyof typeof attributeVocabulary;
type Attributes = {
  [K in AttributeName]?: { value: (typeof attributeVocabulary)[K][number]; evidenceRefs: string[] };
};
export interface ColourObservation {
  roomContext?: ConfirmedRoomColourContext;
  families: Family[];
  evidenceRefs: string[];
  attributes?: Attributes;
  conflict?: boolean;
}
export interface ColourRelationshipContext {
  intent: ColourIntent;
  intentReference: string;
  palette: ColourObservation[];
  desiredAttributes?: Attributes;
}

// Designer relationship hypotheses, NOT supplier facts or measured colour distances.
// No warmth, lightness, saturation or exact hue is inferred from these family groups.
const neutralFamilies = new Set<Family>(['white', 'cream', 'beige', 'taupe', 'grey', 'black']);
const adjacent = [
  ['red', 'orange'],
  ['orange', 'yellow'],
  ['orange', 'gold'],
  ['yellow', 'green'],
  ['gold', 'green'],
  ['green', 'blue'],
  ['blue', 'purple'],
  ['purple', 'pink'],
  ['pink', 'red'],
  ['yellow', 'gold'],
];
const complementary = [
  ['blue', 'orange'],
  ['green', 'red'],
  ['green', 'pink'],
  ['purple', 'yellow'],
  ['purple', 'gold'],
];
const pairIn = (pairs: string[][], a: string, b: string) =>
  pairs.some((p) => p.includes(a) && p.includes(b) && a !== b);
const stable = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const unique = (a: string[]) => [...new Set(a)].sort(stable);
function refs(input: string[]) {
  if (
    !Array.isArray(input) ||
    !input.length ||
    input.some((r) => typeof r !== 'string' || !r.trim() || r.length > 4000)
  )
    throw new Error('Colour evidence reference required');
  return unique(input);
}
function attributes(input: Attributes = {}): Attributes {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Invalid colour attributes');
  const result: Record<string, unknown> = {};
  for (const [key, fact] of Object.entries(input).sort(([a], [b]) => stable(a, b))) {
    if (
      !Object.hasOwn(attributeVocabulary, key) ||
      !fact ||
      Object.keys(fact).some((k) => !['value', 'evidenceRefs'].includes(k)) ||
      !(attributeVocabulary[key as AttributeName] as readonly string[]).includes(fact.value)
    )
      throw new Error('Unsupported colour attribute');
    result[key] = { value: fact.value, evidenceRefs: refs(fact.evidenceRefs) };
  }
  return result as Attributes;
}
function observation(input: ColourObservation): ColourObservation {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).some(
      (k) => !['families', 'evidenceRefs', 'attributes', 'conflict', 'roomContext'].includes(k),
    ) ||
    !Array.isArray(input.families) ||
    input.families.some((f) => !supplierColourFamilies.includes(f)) ||
    (input.conflict !== undefined && typeof input.conflict !== 'boolean')
  )
    throw new Error('Invalid colour observation');
  return {
    families: unique(input.families) as Family[],
    evidenceRefs: refs(input.evidenceRefs),
    attributes: attributes(input.attributes),
    conflict: input.conflict ?? false,
    ...(input.roomContext ? { roomContext: validateRoomColourContext(input.roomContext) } : {}),
  };
}
function normalizedContext(input: ColourRelationshipContext) {
  if (
    !input ||
    Object.keys(input).some(
      (k) => !['intent', 'intentReference', 'palette', 'desiredAttributes'].includes(k),
    ) ||
    !relationshipIntents.includes(input.intent) ||
    !Array.isArray(input.palette) ||
    input.palette.length > 12
  )
    throw new Error('Invalid colour relationship context');
  refs([input.intentReference]);
  const palette = input.palette.map(observation);
  return {
    intent: input.intent,
    intentReference: input.intentReference,
    palette: [...new Map(palette.map((p) => [fingerprintHash(p), p])).entries()]
      .sort(([a], [b]) => stable(a, b))
      .map(([, p]) => p),
    desiredAttributes: attributes(input.desiredAttributes),
  };
}

/** Discrete design support (0/1/2), not a probability, suitability gate or canonical fact. */
export function evaluateColourRelationship(
  input: ColourObservation,
  room: ColourRelationshipContext,
) {
  const fabric = observation(input),
    context = normalizedContext(room);
  const roomFamilies = unique(
    context.palette.filter((p) => !p.conflict).flatMap((p) => p.families),
  ) as Family[];
  const explanations: string[] = [],
    unknowns: string[] = [];
  let familyScore: number | null = null;
  const observed = !fabric.conflict && fabric.families.length > 0;
  if (context.intent === 'advise-me')
    unknowns.push(
      'Advise me uses separate labelled options; there is no single ideal colour relationship.',
    );
  else if (observed && (roomFamilies.length || context.intent === 'neutralise')) {
    const scores = fabric.families.map((f) => {
      if (context.intent === 'neutralise') return neutralFamilies.has(f) ? 2 : 0;
      return Math.max(
        ...roomFamilies.map((r) => {
          const same = f === r,
            neutralBridge = neutralFamilies.has(f) && neutralFamilies.has(r);
          const complement = pairIn(complementary, f, r),
            neighbour = pairIn(adjacent, f, r);
          if (context.intent === 'tonal') return same ? 2 : neutralBridge ? 1 : 0;
          if (context.intent === 'analogous') return neighbour ? 2 : same || neutralBridge ? 1 : 0;
          if (context.intent === 'complementary') return complement ? 2 : 0;
          if (same || neutralBridge) return 0;
          // Accent/contrast require a positive, explicit intent. Different families alone
          // establish a possible change, not measured contrast in the actual room.
          return complement ? 2 : 1;
        }),
      );
    });
    // Conservative multi-family policy: one matching secondary must not hide a conflicting palette.
    familyScore = Math.min(...scores);
    explanations.push(
      `${context.intent}: ${fabric.families.join('/')} against ${roomFamilies.join('/') || 'an unspecified room palette'} has ${familyScore === 2 ? 'direct' : familyScore === 1 ? 'possible' : 'no explicit'} family-level support under ${colourRelationshipPolicy}.`,
    );
    unknowns.push(
      'Exact hue, colour proportions and perceived contrast are not established by colour families.',
    );
  } else
    unknowns.push(
      fabric.conflict
        ? 'Conflicting fabric colour evidence: no relationship score.'
        : 'Fabric or room colour family is unknown: no relationship score.',
    );
  let attributeScore = 0;
  const fabricAttributes = fabric.conflict ? {} : fabric.attributes!;
  for (const key of Object.keys(attributeVocabulary) as AttributeName[]) {
    const known = fabricAttributes[key],
      desired = context.desiredAttributes[key];
    if (!known) unknowns.push(`Colour ${key} is not established for this fabric.`);
    if (known && desired) {
      const agrees = known.value === desired.value;
      attributeScore += agrees ? 1 : 0;
      explanations.push(
        `${key}: supplier/review evidence ${known.value} ${agrees ? 'matches' : 'does not establish'} requested ${desired.value}; no technical exclusion.`,
      );
    }
  }
  const body = {
    policy: colourRelationshipPolicy,
    context,
    fabricFamilies: fabric.families,
    familyScore,
    attributeScore,
    attributes: fabricAttributes,
    designerCategory: observed
      ? fabric.families.every((f) => neutralFamilies.has(f))
        ? 'neutral'
        : fabric.families.every((f) => !neutralFamilies.has(f))
          ? 'coloured'
          : 'mixed'
      : 'unknown',
    evidenceRefs: unique([
      ...fabric.evidenceRefs,
      context.intentReference,
      ...context.palette.flatMap((p) => p.evidenceRefs),
      ...Object.values(fabricAttributes).flatMap((f) => f!.evidenceRefs),
      ...Object.values(context.desiredAttributes).flatMap((f) => f!.evidenceRefs),
    ]),
    explanations,
    unknowns,
  };
  return structuredClone({ ...body, digest: fingerprintHash({ ...body, fabric }) });
}
export type ColourRelationship = ReturnType<typeof evaluateColourRelationship>;
/** Unknown and zero support have equal ordering utility, while retaining distinct explanations. */
export function compareColourRelationships(a: ColourRelationship, b: ColourRelationship) {
  return (b.familyScore ?? 0) - (a.familyScore ?? 0) || b.attributeScore - a.attributeScore;
}
type Candidate = FabricMatchScore & { customerExcluded?: boolean };
const missing = (): ColourObservation => ({
  families: [],
  evidenceRefs: ['system:colour-not-established'],
});
export function orderByColourRelationship<T extends Candidate>(
  matches: readonly T[],
  observations: Readonly<Record<string, ColourObservation>>,
  context: ColourRelationshipContext,
): T[] {
  const eligible = matches.filter(
    (m) => m.eligible && m.technicalDecision !== 'incompatible' && !m.customerExcluded,
  );
  const components = new Map(
    eligible.map((m) => [
      m.fabricId,
      evaluateColourRelationship(observations[m.fabricId] ?? missing(), context),
    ]),
  );
  return structuredClone(
    [...eligible].sort((a, b) => {
      const base = compareRecommendationCandidates(
        { ...a, fabricId: '' },
        { ...b, fabricId: '' },
        (m) => m.overallScore,
      );
      const x = components.get(a.fabricId)!,
        y = components.get(b.fabricId)!;
      return base || compareColourRelationships(x, y) || stable(a.fabricId, b.fabricId);
    }),
  );
}

/** Bounded alternative view. Each slot names its own intent; it is not a blended score. */
export function adviseColourOptions<T extends Candidate>(
  matches: readonly T[],
  observations: Readonly<Record<string, ColourObservation>>,
  context: ColourRelationshipContext,
  designId: (m: T) => string,
) {
  const used = new Set<string>();
  const slots: [ColourIntent, string][] = [
    ['tonal', 'Best tonal match'],
    ['complementary', 'Best complementary choice'],
    ['neutralise', 'Best neutral option'],
    ['accent', 'Bolder alternative'],
  ];
  // Never cross a readiness tier merely to fill an attractive label.
  const eligible = matches
    .filter((m) => m.eligible && m.technicalDecision !== 'incompatible' && !m.customerExcluded)
    .sort((a, b) => compareRecommendationCandidates(a, b, (m) => m.overallScore));
  const strongest = eligible[0]?.technicalDecision;
  return slots.flatMap(([intent, label]) => {
    const slotContext = { ...context, intent };
    const ordered = orderByColourRelationship(
      eligible.filter((m) => m.technicalDecision === strongest),
      observations,
      slotContext,
    );
    const candidate = ordered.find(
      (m) =>
        !used.has(designId(m)) &&
        (evaluateColourRelationship(observations[m.fabricId] ?? missing(), slotContext)
          .familyScore ?? 0) > 0,
    );
    if (!candidate) return [];
    used.add(designId(candidate));
    return [
      {
        label,
        match: structuredClone(candidate),
        relationship: evaluateColourRelationship(
          observations[candidate.fabricId] ?? missing(),
          slotContext,
        ),
        qualification:
          'Best available within the retained technical tier and existing customer-utility ordering; family-level hypothesis for human review.',
      },
    ];
  });
}
