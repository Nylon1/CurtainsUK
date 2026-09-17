import { fingerprintHash } from '../fingerprint/engine';
import {
  colourFamilies,
  standardizeReference,
  type ColourFamily,
  type Observation,
  type ReferenceProvenance,
} from './evidence';
import type { ColourRelationshipContext } from '../matching/colour-relationship';
import {
  roomPalettePolicy,
  roomFeatures,
  colourInfluences,
  type RoomFeature,
  type ColourInfluence,
} from './room-context';

export const palettePolicy = 'customer-correctable-reference-palette-v1';
export const paletteCategories = ['primary', 'secondary', 'accent'] as const;
export type PaletteCategory = (typeof paletteCategories)[number];
export type Palette = Record<PaletteCategory, ColourFamily[]>;
/** Native extractor contract: no definitive or singular primary field required. */
export type PaletteObservation = { schema: 'hci-draft-palette-observation-v1'; palette: Palette };
export type PaletteAction = { id: string; revision: number } & (
  | { type: 'confirm' }
  | { type: 'confirm-room' }
  | { type: 'complete-review' }
  | { type: 'begin-review' }
  | { type: 'keep' | 'remove'; colour: ColourFamily }
  | { type: 'add' | 'move'; colour: ColourFamily; category: PaletteCategory }
  | {
      type: 'describe' | 'review-colour';
      previousColour: ColourFamily | null;
      colour: ColourFamily;
      category: PaletteCategory;
      feature: RoomFeature | null;
      influence: ColourInfluence;
    }
);
export type PaletteEdit = PaletteAction extends infer T
  ? T extends PaletteAction
    ? Omit<T, 'id' | 'revision'>
    : never
  : never;
export type RoomColour = {
  feature: RoomFeature | null;
  influence: ColourInfluence;
  source: 'MACHINE_OBSERVED' | 'CUSTOMER_CONFIRMED' | 'CUSTOMER_ADDED';
  observedColour: ColourFamily | null;
};
export type RoomColours = Partial<Record<ColourFamily, RoomColour>>;
export type RoomPalette = {
  policy: typeof roomPalettePolicy;
  colours: RoomColours;
  confirmed: RoomColours | null;
};
export type RoomReview = {
  policy: 'guided-room-colour-review-v1';
  colours: Partial<Record<ColourFamily, 'NEEDS_INPUT' | 'CONFIRMED' | 'IGNORED'>>;
};
export function reviewStatus(state: PaletteState, colour: ColourFamily) {
  return state.review?.colours[colour] ?? 'NEEDS_INPUT';
}
export function roomReviewComplete(state: PaletteState) {
  return (
    Boolean(state.review) &&
    paletteCategories.every((role) =>
      state.palette[role].every((colour) => reviewStatus(state, colour) !== 'NEEDS_INPUT'),
    )
  );
}
function retainedReview(state: PaletteState, palette: Palette): RoomReview {
  return {
    policy: 'guided-room-colour-review-v1',
    colours: Object.fromEntries(
      paletteCategories.flatMap((role) =>
        palette[role].map((colour) => [colour, reviewStatus(state, colour)]),
      ),
    ),
  };
}
export type PaletteEvent = {
  review?: RoomReview;
  room?: RoomPalette;
  id: string;
  revision: number;
  actionDigest: string;
  aiProposedColour: ColourFamily | null;
  colour: ColourFamily | null;
  customerAction: PaletteAction['type'];
  finalCategory: PaletteCategory | null;
  consultationId: string;
  imageHash: string;
  extractorVersion: string;
  draftDigest: string;
  previousDigest: string;
  palette: Palette;
};
export type PaletteState = {
  review?: RoomReview;
  room?: RoomPalette;
  draft: {
    policy: string;
    originalObservation: Observation | PaletteObservation;
    originalOutputDigest: string;
    provenance: ReferenceProvenance;
    palette: Palette;
    digest: string;
  };
  revision: number;
  palette: Palette;
  confirmedPalette: Palette | null;
  events: PaletteEvent[];
  digest: string;
};
function categoryOf(palette: Palette, colour: ColourFamily) {
  return paletteCategories.find((c) => palette[c].includes(colour)) ?? null;
}
export function validatePalette(value: Palette) {
  if (!value || Object.keys(value).length !== 3) throw Error('INVALID_PALETTE');
  const colours: ColourFamily[] = [];
  for (const c of paletteCategories) {
    if (
      !Array.isArray(value[c]) ||
      value[c].length > 3 ||
      value[c].some((x) => !colourFamilies.includes(x))
    )
      throw Error('INVALID_PALETTE');
    colours.push(...value[c]);
  }
  if (new Set(colours).size !== colours.length) throw Error('DUPLICATE_PALETTE_COLOUR');
}
/** Versioned adapter over the frozen observation. Significant observed families are
 * co-primary suggestions, not a single definitive surface/paint colour. No retraining.
 * Legacy >=15% secondary families join the dominant family as up to three primaries;
 * remaining major families are secondary; the original accent list is capped at three.
 * The complete observation, including unselected colours, remains immutable below. */
export function createPalette(
  observation: Observation | PaletteObservation,
  provenance: ReferenceProvenance,
): PaletteState {
  if ('schema' in observation) {
    if (
      observation.schema !== 'hci-draft-palette-observation-v1' ||
      Object.keys(observation).length !== 2 ||
      !provenance.consultationId ||
      !/^sha256:[a-f0-9]{64}$/.test(provenance.imageHash) ||
      !provenance.modelVersion
    )
      throw Error('INVALID_PALETTE_OBSERVATION');
    validatePalette(observation.palette);
    const body = {
      policy: palettePolicy,
      originalObservation: structuredClone(observation),
      originalOutputDigest: fingerprintHash({ observation, provenance }),
      provenance: structuredClone(provenance),
      palette: structuredClone(observation.palette),
    };
    const state = {
      draft: { ...body, digest: fingerprintHash(body) },
      revision: 0,
      palette: structuredClone(observation.palette),
      confirmedPalette: null,
      events: [],
    };
    return { ...state, digest: fingerprintHash(state) };
  }
  const evidence = standardizeReference(observation, provenance);
  const major = [
    ...(observation.primaryColourFamily === 'UNKNOWN' ? [] : [observation.primaryColourFamily]),
    ...observation.secondaryColourFamilies,
  ];
  const palette: Palette = {
    primary: major.slice(0, 3),
    secondary: major.slice(3, 6),
    accent: observation.accentColours.slice(0, 3),
  };
  validatePalette(palette);
  const body = {
    policy: palettePolicy,
    originalObservation: evidence.attributes,
    originalOutputDigest: evidence.outputDigest,
    provenance: evidence.provenance,
    palette,
  };
  const state = {
    draft: { ...body, digest: fingerprintHash(body) },
    revision: 0,
    palette,
    confirmedPalette: null,
    events: [],
  };
  return structuredClone({ ...state, digest: fingerprintHash(state) });
}
export function editPalette(state: PaletteState, action: PaletteAction): PaletteState {
  if (action?.type === 'describe' || action?.type === 'review-colour')
    return describePalette(state, action);
  const fields =
    action &&
    [
      'confirm',
      'confirm-room',
      'complete-review',
      'begin-review',
      'keep',
      'remove',
      'add',
      'move',
    ].includes(action.type)
      ? [
          'id',
          'revision',
          'type',
          ...(['confirm', 'confirm-room', 'complete-review', 'begin-review'].includes(action.type)
            ? []
            : ['colour']),
          ...(['add', 'move'].includes(action.type) ? ['category'] : []),
        ]
      : [];
  if (
    !action ||
    Object.keys(action).length !== fields.length ||
    Object.keys(action).some((k) => !fields.includes(k)) ||
    !/^[a-zA-Z0-9:_-]{1,160}$/.test(action.id) ||
    !Number.isSafeInteger(action.revision) ||
    action.revision < 0
  )
    throw Error('INVALID_PALETTE_ACTION');
  const actionDigest = fingerprintHash(action);
  const previous = state.events.find((e) => e.id === action.id);
  if (previous) {
    if (previous.actionDigest !== actionDigest) throw Error('PALETTE_IDEMPOTENCY_CONFLICT');
    return structuredClone(state);
  }
  if (action.revision !== state.revision) throw Error('STALE_PALETTE_REVISION');
  if (state.events.length >= 200) throw Error('PALETTE_EVENT_LIMIT');
  if (
    (action.type === 'complete-review' ||
      (state.review && ['confirm', 'confirm-room'].includes(action.type))) &&
    !roomReviewComplete(state)
  )
    throw Error('ROOM_REVIEW_INCOMPLETE');
  const palette = structuredClone(state.palette);
  const colour =
    action.type === 'confirm' ||
    action.type === 'confirm-room' ||
    action.type === 'complete-review' ||
    action.type === 'begin-review'
      ? null
      : action.colour;
  const before = colour ? categoryOf(palette, colour) : null;
  if (
    action.type !== 'confirm' &&
    action.type !== 'confirm-room' &&
    action.type !== 'complete-review' &&
    action.type !== 'begin-review'
  ) {
    if (!colourFamilies.includes(action.colour)) throw Error('INVALID_PALETTE_COLOUR');
    if (action.type === 'add' ? before !== null : before === null)
      throw Error('INVALID_PALETTE_CHANGE');
    if (action.type === 'move' || action.type === 'remove')
      palette[before!] = palette[before!].filter((c) => c !== colour);
    if (action.type === 'move' || action.type === 'add') {
      if (!paletteCategories.includes(action.category)) throw Error('INVALID_PALETTE_CATEGORY');
      if (before === action.category) throw Error('PALETTE_ALREADY_IN_CATEGORY');
      palette[action.category].push(action.colour);
    }
  }
  validatePalette(palette);
  const room =
    state.room ||
    action.type === 'confirm-room' ||
    action.type === 'complete-review' ||
    action.type === 'begin-review'
      ? retainedRoom(state, palette)
      : undefined;
  const review =
    state.review || action.type === 'begin-review' ? retainedReview(state, palette) : undefined;
  if (review && colour && ['add', 'move'].includes(action.type))
    review.colours[colour] = 'NEEDS_INPUT';
  if (room && action.type === 'add')
    room.colours[action.colour] = {
      feature: null,
      influence: 'consider',
      source: 'CUSTOMER_ADDED',
      observedColour: null,
    };
  if (room)
    room.confirmed =
      action.type === 'confirm' ||
      action.type === 'confirm-room' ||
      action.type === 'complete-review'
        ? structuredClone(room.colours)
        : action.type === 'keep'
          ? state.room!.confirmed
          : null;
  const event: PaletteEvent = {
    ...(review ? { review: structuredClone(review) } : {}),
    id: action.id,
    revision: state.revision + 1,
    actionDigest,
    aiProposedColour: colour && categoryOf(state.draft.palette, colour) ? colour : null,
    colour,
    customerAction: action.type,
    finalCategory: colour ? categoryOf(palette, colour) : null,
    consultationId: state.draft.provenance.consultationId,
    imageHash: state.draft.provenance.imageHash,
    extractorVersion: state.draft.provenance.modelVersion,
    draftDigest: state.draft.digest,
    previousDigest: state.digest,
    palette: structuredClone(palette),
    ...(room ? { room: structuredClone(room) } : {}),
  };
  const body = {
    ...(review ? { review } : {}),
    ...(room ? { room } : {}),
    draft: structuredClone(state.draft),
    revision: event.revision,
    palette,
    confirmedPalette:
      action.type === 'confirm' ||
      action.type === 'confirm-room' ||
      action.type === 'complete-review'
        ? structuredClone(palette)
        : action.type === 'keep'
          ? state.confirmedPalette
          : null,
    events: [...state.events, event],
  };
  return structuredClone({ ...body, digest: fingerprintHash(body) });
}
export function roomColour(state: PaletteState, colour: ColourFamily): RoomColour {
  return structuredClone(
    state.room?.colours[colour] ?? {
      feature: null,
      influence: 'consider',
      source: categoryOf(state.draft.palette, colour) ? 'MACHINE_OBSERVED' : 'CUSTOMER_ADDED',
      observedColour: categoryOf(state.draft.palette, colour) ? colour : null,
    },
  );
}
function retainedRoom(state: PaletteState, palette: Palette): RoomPalette {
  return {
    policy: roomPalettePolicy,
    colours: Object.fromEntries(
      paletteCategories.flatMap((group) =>
        palette[group].map((colour) => [colour, roomColour(state, colour)]),
      ),
    ),
    confirmed: null,
  };
}
/** One atomic, validated customer correction. Legacy actions/digests remain replayable. */
function describePalette(
  state: PaletteState,
  action: Extract<PaletteAction, { previousColour: ColourFamily | null }>,
): PaletteState {
  const fields = [
    'id',
    'revision',
    'type',
    'previousColour',
    'colour',
    'category',
    'feature',
    'influence',
  ];
  if (
    Object.keys(action).length !== fields.length ||
    Object.keys(action).some((k) => !fields.includes(k)) ||
    !/^[a-zA-Z0-9:_-]{1,160}$/.test(action.id) ||
    !Number.isSafeInteger(action.revision) ||
    action.revision < 0 ||
    !colourFamilies.includes(action.colour) ||
    (action.previousColour !== null && !colourFamilies.includes(action.previousColour)) ||
    !paletteCategories.includes(action.category) ||
    (action.feature !== null && !roomFeatures.includes(action.feature)) ||
    !colourInfluences.includes(action.influence)
  )
    throw Error('INVALID_PALETTE_ACTION');
  const actionDigest = fingerprintHash(action),
    prior = state.events.find((e) => e.id === action.id);
  if (prior) {
    if (prior.actionDigest !== actionDigest) throw Error('PALETTE_IDEMPOTENCY_CONFLICT');
    return structuredClone(state);
  }
  if (action.revision !== state.revision) throw Error('STALE_PALETTE_REVISION');
  if (state.events.length >= 200) throw Error('PALETTE_EVENT_LIMIT');
  const palette = structuredClone(state.palette),
    before = action.previousColour ? categoryOf(palette, action.previousColour) : null;
  if (action.previousColour !== null && !before) throw Error('INVALID_PALETTE_CHANGE');
  if (action.colour !== action.previousColour && categoryOf(palette, action.colour))
    throw Error('DUPLICATE_PALETTE_COLOUR');
  const original = action.previousColour ? roomColour(state, action.previousColour) : null;
  if (before === action.category) {
    palette[before] = palette[before].map((c) => (c === action.previousColour ? action.colour : c));
  } else {
    if (before) palette[before] = palette[before].filter((c) => c !== action.previousColour);
    palette[action.category].push(action.colour);
  }
  validatePalette(palette);
  const room = retainedRoom(state, palette);
  const review =
    state.review || action.type === 'review-colour' ? retainedReview(state, palette) : undefined;
  if (review)
    review.colours[action.colour] =
      action.type === 'review-colour'
        ? action.influence === 'ignore'
          ? 'IGNORED'
          : 'CONFIRMED'
        : 'NEEDS_INPUT';
  room.colours[action.colour] = {
    feature: action.feature,
    influence: action.influence,
    source:
      original?.source === 'CUSTOMER_ADDED' || !original ? 'CUSTOMER_ADDED' : 'CUSTOMER_CONFIRMED',
    observedColour: original?.observedColour ?? null,
  };
  const event: PaletteEvent = {
    ...(review ? { review: structuredClone(review) } : {}),
    id: action.id,
    revision: state.revision + 1,
    actionDigest,
    aiProposedColour: original?.observedColour ?? null,
    colour: action.colour,
    customerAction: action.type,
    finalCategory: action.category,
    consultationId: state.draft.provenance.consultationId,
    imageHash: state.draft.provenance.imageHash,
    extractorVersion: state.draft.provenance.modelVersion,
    draftDigest: state.draft.digest,
    previousDigest: state.digest,
    palette: structuredClone(palette),
    room: structuredClone(room),
  };
  const body = {
    ...(review ? { review } : {}),
    draft: structuredClone(state.draft),
    revision: event.revision,
    palette,
    confirmedPalette: null,
    events: [...state.events, event],
    room,
  };
  return { ...body, digest: fingerprintHash(body) };
}
/** Confirmed role groups replace ALL proposed families, including an intentionally
 * empty palette. This is room context, never supplier facts or a taste mutation. */
export function paletteContext(state: PaletteState): ColourRelationshipContext {
  const selected = state.confirmedPalette ?? state.draft.palette;
  if (state.confirmedPalette && state.room?.confirmed) {
    const metadata = state.room.confirmed;
    return {
      intent: 'advise-me',
      intentReference: `${roomPalettePolicy}:${state.digest}`,
      palette: paletteCategories.flatMap((role) =>
        selected[role]
          .filter((colour) => metadata[colour]?.influence !== 'ignore')
          .map((colour) => ({
            families: [colour],
            evidenceRefs: [
              `${roomPalettePolicy}:customer-confirmed:${role}:${colour}:${state.digest}`,
            ],
            roomContext: {
              feature: metadata[colour]?.feature ?? null,
              role,
              influence:
                metadata[colour]?.influence === 'important'
                  ? ('important' as const)
                  : ('consider' as const),
              source: 'customer-confirmed' as const,
            },
          })),
      ),
    };
  }
  return {
    intent: 'advise-me',
    intentReference: `${palettePolicy}:${state.digest}`,
    palette: paletteCategories
      .filter((c) => selected[c].length)
      .map((c) => ({
        families: [...selected[c]],
        evidenceRefs: [
          `${palettePolicy}:${state.confirmedPalette ? 'customer-confirmed' : 'draft'}:${c}:${state.digest}`,
        ],
      })),
  };
}
