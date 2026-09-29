import { initialPresentationPhase } from './presentation';
import { GUIDE_PRICE_LEVELS } from '../../fabric-master/guide-price-level';
import type { ConsultationState, NailaView, Preference } from './types';
import { colourPresentation } from './colours';

type RecordValue = Record<string, unknown>;
const object = (v: unknown): RecordValue => v && typeof v === 'object' && !Array.isArray(v) ? v as RecordValue : {};
const records = (v: unknown) => Array.isArray(v) ? v.map(object) : [];
const id = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9:_-]{1,160}$/.test(v);

// Labels for the existing premium taste IDs, not a new taxonomy or evidence mapping.
// Authority: HCI curtainsuk-premium-taste.ts / question bank (merged d747e4b).
const labels: Record<string, Record<string, string>> = {
  'curtain-priority': { dark: 'A darker room', privacy: 'More privacy', 'soft-light': 'Soft daylight', appearance: 'Mainly the look' },
  atmosphere: { calm_and_restful: 'Calm and restful', warm_and_welcoming: 'Warm and welcoming', crisp_and_minimal: 'Crisp and minimal', rich_and_expressive: 'Rich and expressive' },
  pattern: { plain: 'Keep it subtle', subtle: 'A little pattern', textured_plain: 'Textured plain', botanical: 'Botanical', geometric: 'Geometric', stripe: 'Stripe', statement: 'Make it expressive' },
  'colour-family': Object.fromEntries(['Neutral','Blue','Green','Pink','Terracotta','White','Cream','Beige','Taupe','Brown','Grey','Black','Red','Purple','Orange','Yellow','Gold'].map(label => [label.toLowerCase(), label])),
};

/** Pure downstream projection. Accepts only the owner-checked, committed server state.
 * No commands, scores, catalogue reads, inferred personal facts or state writes. */
export function projectConsultationState(state: unknown, view: NailaView, commerce: unknown = []): ConsultationState {
  const source = object(state);
  const confirmed = new Map<string, Preference>();
  for (const answer of records(source.tasteAnswers).slice(0, 8)) {
    const dimension = String(answer.questionId), value = String(answer.answerId);
    const label = (dimension==='colour-family'?colourPresentation(value)?.label:undefined) ?? labels[dimension]?.[value];
    if (label) confirmed.set(dimension, { dimension, value, label, confidence: 'confirmed' });
  }
  const emerging: Preference[] = [], unclear: Preference[] = [];
  // The brief is already HCI's current derived interpretation. A proposal is
  // never described as something the customer explicitly said.
  for (const section of view.interiorBrief?.sections ?? []) {
    const dimension = section.dimension === 'colour.family' ? 'colour-family' : section.dimension;
    const label = section.options.find(option => option.value === section.value)?.label;
    if (!label) continue;
    const explicit = section.changed || view.interiorBrief?.status === 'CUSTOMER_CONFIRMED';
    const preference: Preference = { dimension, value: section.value, label, confidence: explicit ? 'confirmed' : 'emerging' };
    if (explicit) confirmed.set(dimension, preference);
    else {
      if (confirmed.has(dimension) && confirmed.get(dimension)!.value.toLowerCase().replaceAll('_',' ') !== section.value.toLowerCase()) {
        unclear.push({ ...preference, confidence: 'unclear' });
        confirmed.delete(dimension);
      } else if (!confirmed.has(dimension)) emerging.push(preference);
    }
  }
  const calibrationReactions = records(source.eyeReactions).filter(r => id(r.fabricMasterId) && ['LOVE','LIKE','NOT_SURE','DISLIKE'].includes(String(r.reaction)))
    .slice(-8).map(r => ({ fabricMasterId: String(r.fabricMasterId), reaction: String(r.reaction) }));
  const events = records(commerce);
  const reactions = new Map<string, string>(calibrationReactions.map(r => [r.fabricMasterId, r.reaction]));
  const fabricReactions = events.filter(e => e.event === 'FABRIC_REACTION' && id(e.fabricMasterId) && ['LOVE','MORE_LIKE_THIS','NOT_QUITE','NOT_FOR_ME'].includes(String(e.reaction)))
    .slice(-100).map(e => ({ fabricMasterId: String(e.fabricMasterId), reaction: String(e.reaction) }));
  fabricReactions.forEach(r => reactions.set(r.fabricMasterId, r.reaction));
  const shortlist = [...new Set(events.filter(e => e.event === 'FABRIC_SELECTED' && id(e.fabricMasterId)).map(e => String(e.fabricMasterId)))].slice(-50);
  const price = GUIDE_PRICE_LEVELS.find(p => p.id === view.priceLevel?.selected);
  const summary = [...confirmed.values()].slice(-2).map(p => `You chose “${p.label}”.`);
  const colours=[...confirmed.values()].filter(p=>p.dimension==='colour-family');
  if(colours.length) {
    for(let i=summary.length-1;i>=0;i--)if(colours.some(p=>summary[i]===`You chose “${p.label}”.`))summary.splice(i,1);
    summary.unshift(`You chose ${colours.map(p=>p.label).join(' and ')} to explore.`);
  }
  if (!summary.length && emerging.length) summary.push(`The choices so far suggest ${emerging[0].label.toLowerCase()}.`);
  if (unclear.length) summary.push('There’s more than one possibility here. We can keep both open as we explore.');
  if (price) summary.push(`Your chosen price level is ${price.label}.`);
  // Only exact common values can narrow Browse. No approximate atmosphere,
  // warmth, confidence or activity-to-pattern conversion is permitted.
  const browseFilters: Record<string, string> = {};
  const allowed: Record<string, { key: string; values: string[] }> = {
    'colour-family': { key: 'colour', values: ['neutral','blue','green','red','pink','orange','purple','grey','brown','black','white/cream','beige/taupe','yellow/gold','multicolour'] },
    pattern: { key: 'pattern', values: ['plain','textured plain','botanical','geometric','stripe'] },
    texture: { key: 'texture', values: ['smooth','textured','velvet','linen look'] },
    sheen: { key: 'finish', values: ['matte','sheen','lustrous'] },
  };
  for (const p of confirmed.values()) {
    const mapping = allowed[p.dimension], value = p.value.toLowerCase().replaceAll('_', ' ');
    if (mapping?.values.includes(value)) browseFilters[mapping.key] = value;
  }
  return {
    version: 2, sessionId: view.sessionId, revision: view.revision,
    confirmedPreferences: [...confirmed.values()], emergingPreferences: emerging, unclearPreferences: unclear,
    likedFabricIds: [...reactions].filter(([,r]) => ['LOVE','LIKE','MORE_LIKE_THIS'].includes(r)).map(([key]) => key),
    dislikedFabricIds: [...reactions].filter(([,r]) => ['DISLIKE','NOT_FOR_ME'].includes(r)).map(([key]) => key),
    currentShortlist: shortlist,
    rejectedDirections: [...new Set(events.filter(e => e.event === 'STRATEGY_REACTION' && e.reaction === 'DISLIKE' && id(e.strategyId)).map(e => String(e.strategyId)))].slice(-10),
    currentPriceLevel: price?.id ?? null, currentRoom: null, currentPhase: initialPresentationPhase(view),
    workspace: 'browse', directionIndex: null, selectedFabricId: null, returnPhase: null,
    currentQuestion: view.question?.id ?? null, lastCompletedMoment: `revision:${view.revision}`,
    calibrationReactions, fabricReactions, summary, browseFilters,
  };
}
