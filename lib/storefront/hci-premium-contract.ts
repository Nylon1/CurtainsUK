import { selectedCustomerShade } from '../../vendor/hci-approved/intelligence/reference-images/customer-shades';
import { colourFamilies, type ColourFamily } from '../../vendor/hci-approved/intelligence/reference-images/evidence';
export const HCI_PREMIUM_BASELINE = '6963feb3d3e85e80b759cd2e3cc5a505e8a80960';
export const HCI_PREMIUM_CONTRACT = 'curtainsuk-premium-customer-v1';
export const PREMIUM_HCI_COOKIE = '__Host-cuk_premium_consultation';
export const PREMIUM_HCI_MAX_AGE = 7 * 86400;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const reactions = ['LOVE', 'LIKE', 'NOT_SURE', 'DISLIKE'];
const fabricReactions = ['LOVE', 'MORE_LIKE_THIS', 'NOT_QUITE', 'NOT_FOR_ME'];
const directionReactions = ['LOVE', 'LIKE', 'DISLIKE'];
const referenceTypes = ['room', 'paint', 'sofa-upholstery', 'wallpaper', 'rug', 'flooring', 'existing-fabric', 'moodboard'];
const paletteCategories = ['primary', 'secondary', 'accent'];
const roomFeatures = ['walls', 'sofa', 'flooring', 'rug', 'wallpaper', 'furniture', 'curtains', 'cushions', 'artwork', 'accessories', 'other'];
const influences = ['important', 'consider', 'ignore'];
export type PremiumHciCommand = { requestId: string; sessionId: string; revision: number | null; action?: Record<string, unknown> };

function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('HCI_CONTRACT_INVALID'); return value as Record<string, unknown>; }
function string(value: unknown, maximum = 400): string { if (typeof value !== 'string' || !value.length || value.length > maximum) throw Error('HCI_CONTRACT_INVALID'); return value; }
function fields(value: Record<string, unknown>, allowed: readonly string[]) { if (Object.keys(value).some((key) => !allowed.includes(key)) || allowed.some((key) => !Object.hasOwn(value, key))) throw Error('HCI_CONTRACT_INVALID'); }
function paletteEdit(value: unknown) {
  const edit = object(value); const type = string(edit.type, 40); const common = ['id', 'revision', 'type'];
  const byType: Record<string, string[]> = {
    'begin-review': common, 'complete-review': common, confirm: common, 'confirm-room': common,
    keep: [...common, 'colour'], remove: [...common, 'colour'], add: [...common, 'colour', 'category'], move: [...common, 'colour', 'category'],
    describe: [...common, 'previousColour', 'colour', 'category', 'feature', 'influence'], 'review-colour': [...common, 'previousColour', 'colour', 'category', 'feature', 'influence'],
  };
  const allowed = byType[type]; if (!allowed) throw Error('HCI_CONTRACT_INVALID');
  if (['describe', 'review-colour'].includes(type) && Object.hasOwn(edit, 'customerSelectedShade')) allowed.push('customerSelectedShade');
  fields(edit, allowed);
  if (Object.hasOwn(edit, 'customerSelectedShade') && edit.customerSelectedShade !== null && !selectedCustomerShade(edit.colour as ColourFamily, edit.customerSelectedShade)) throw Error('HCI_CONTRACT_INVALID');
  if (!/^[a-zA-Z0-9:_-]{1,160}$/.test(string(edit.id, 160)) || !Number.isSafeInteger(edit.revision) || Number(edit.revision) < 0) throw Error('HCI_CONTRACT_INVALID');
  if ('category' in edit && !paletteCategories.includes(string(edit.category, 30))) throw Error('HCI_CONTRACT_INVALID');
  if ('feature' in edit && edit.feature !== null && !roomFeatures.includes(string(edit.feature, 60))) throw Error('HCI_CONTRACT_INVALID');
  if ('influence' in edit && !influences.includes(string(edit.influence, 30))) throw Error('HCI_CONTRACT_INVALID');
  if ('previousColour' in edit && edit.previousColour !== null) string(edit.previousColour, 30);
  if ('colour' in edit && !colourFamilies.includes(string(edit.colour, 30) as ColourFamily)) throw Error('HCI_CONTRACT_INVALID'); return edit;
}

/** Browser input is bounded and parsed before it reaches the server-only gateway. */
export function premiumHciCommand(value: unknown): PremiumHciCommand {
  const body = object(value);
  if (Object.keys(body).some((key) => !['requestId', 'sessionId', 'revision', 'action'].includes(key)) || !Object.hasOwn(body, 'requestId') || !Object.hasOwn(body, 'sessionId') || !Object.hasOwn(body, 'revision')) throw Error('HCI_CONTRACT_INVALID');
  const requestId = string(body.requestId, 36); const sessionId = body.sessionId == null ? requestId : string(body.sessionId, 36);
  if (!uuid.test(requestId) || !uuid.test(sessionId) || (body.revision !== null && (!Number.isSafeInteger(body.revision) || Number(body.revision) < 0))) throw Error('HCI_CONTRACT_INVALID');
  if (body.action == null) return { requestId, sessionId, revision: body.revision == null ? null : Number(body.revision) };
  const action = object(body.action); const type = string(action.type, 30);
  if (type === 'answer') { fields(action, ['type', 'answerId']); action.answerId = string(action.answerId); }
  else if (type === 'calibrate') { fields(action, ['type', 'reaction']); if (!reactions.includes(string(action.reaction, 30))) throw Error('HCI_CONTRACT_INVALID'); }
  else if (type === 'recommend' || type === 'finish') fields(action, ['type']);
  else if (type === 'brief-change') {
    fields(action, ['type', 'id', 'choice']);
    if (!uuid.test(string(action.id, 36))) throw Error('HCI_CONTRACT_INVALID');
    const choice = object(action.choice); fields(choice, ['dimension', 'value']);
    if (!['atmosphere', 'pattern', 'colour.family', 'texture', 'sheen'].includes(string(choice.dimension, 40))) throw Error('HCI_CONTRACT_INVALID');
    string(choice.value, 100);
  }
  else if (type === 'brief-confirm' || type === 'brief-adjust') {
    fields(action, ['type', 'id']); if (!uuid.test(string(action.id, 36))) throw Error('HCI_CONTRACT_INVALID');
  }
  else if (type === 'image') { fields(action, ['type', 'mime', 'bytes', 'referenceType']); if (!['image/jpeg', 'image/png', 'image/webp'].includes(string(action.mime, 30)) || !referenceTypes.includes(string(action.referenceType, 40))) throw Error('HCI_CONTRACT_INVALID'); string(action.bytes, 2_800_000); }
  else if (type === 'palette') { fields(action, ['type', 'edit']); action.edit = paletteEdit(action.edit); }
  else if (type === 'feedback') {
    fields(action, ['type', 'command']); const command = object(action.command); fields(command, ['id', 'strategyId', 'fabricId', 'fabricReaction', 'directionReaction', 'optionIds']);
    if (!/^[a-zA-Z0-9:_-]{1,160}$/.test(string(command.id, 160)) || !/^[a-zA-Z0-9:_-]{1,160}$/.test(string(command.strategyId, 160)) || !/^[a-zA-Z0-9:_-]{1,160}$/.test(string(command.fabricId, 160)) || (command.fabricReaction !== null && !fabricReactions.includes(string(command.fabricReaction, 30))) || (command.directionReaction !== null && !directionReactions.includes(string(command.directionReaction, 30))) || !Array.isArray(command.optionIds) || command.optionIds.length > 12 || command.optionIds.some((id) => !/^[a-zA-Z0-9:_-]{1,160}$/.test(string(id, 160)))) throw Error('HCI_CONTRACT_INVALID');
  } else if (type === 'outcome') { fields(action, ['type', 'event', 'fabricMasterId', 'strategyId']); if (!['SAMPLE_INTENT', 'FABRIC_SELECTED'].includes(string(action.event, 30))) throw Error('HCI_CONTRACT_INVALID'); action.fabricMasterId = string(action.fabricMasterId, 150); action.strategyId = string(action.strategyId, 160); }
  else throw Error('HCI_CONTRACT_INVALID');
  return { requestId, sessionId, revision: body.revision == null ? null : Number(body.revision), action };
}

export function premiumHciEnabled(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>) {
  const environmentMatchesStage =
    (env.VERCEL_ENV === 'preview' && env.CURTAINSUK_DEPLOYMENT_STAGE === 'STAGING') ||
    (env.VERCEL_ENV === 'production' && env.CURTAINSUK_DEPLOYMENT_STAGE === 'PRODUCTION');
  return environmentMatchesStage && env.CURTAINSUK_HCI_INTEGRATION_ENABLED === 'true' && env.CURTAINSUK_HCI_PREMIUM_ENABLED === 'true';
}
