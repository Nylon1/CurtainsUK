import { HCI_PREMIUM_BASELINE, HCI_PREMIUM_CONTRACT } from './hci-premium-contract';
import { assertNoRawReferenceMedia } from './hci-image-privacy';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('HCI_CONTRACT_INVALID');
  return value as Record<string, unknown>;
}
function string(value: unknown, maximum = 400): string {
  if (typeof value !== 'string' || !value.length || value.length > maximum) throw Error('HCI_CONTRACT_INVALID');
  return value;
}
function fields(value: Record<string, unknown>, allowed: readonly string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key)) || allowed.some((key) => !Object.hasOwn(value, key))) throw Error('HCI_CONTRACT_INVALID');
}

export function customerView(value: unknown) {
  const view = object(value);
  if (view.version !== HCI_PREMIUM_CONTRACT || view.sourceCommit !== HCI_PREMIUM_BASELINE || !uuid.test(string(view.sessionId, 36)) ||
    !['discovery', 'calibration', 'complete', 'directions', 'final'].includes(string(view.phase, 30)) || !Array.isArray(view.directions) || view.directions.length > 5)
    throw Error('HCI_CONTRACT_INVALID');
  if (JSON.stringify(view).length > 1_000_000) throw Error('HCI_CONTRACT_INVALID');
  assertNoRawReferenceMedia(view);
  if ('revision' in view && (!Number.isSafeInteger(view.revision) || Number(view.revision) < 0)) throw Error('HCI_CONTRACT_INVALID');
  const seen = new Set<string>();
  const progress = (value: unknown, maximum: number) => {
    if (value === null || value === undefined) return null;
    const item = object(value);
    fields(item, ['current', 'total']);
    if (!Number.isSafeInteger(item.current) || !Number.isSafeInteger(item.total) ||
      Number(item.current) < 1 || Number(item.total) < 1 || Number(item.current) > Number(item.total) || Number(item.total) > maximum)
      throw Error('HCI_CONTRACT_INVALID');
    return { current: Number(item.current), total: Number(item.total) };
  };
  const eye = view.calibrationFabric == null ? null : (() => {
    const item = object(view.calibrationFabric);
    fields(item, ['fabricMasterId', 'supplierSku', 'brand', 'design', 'colourway', 'imageUrl']);
    const imageUrl = new URL(string(item.imageUrl, 2000));
    if (imageUrl.protocol !== 'https:' || imageUrl.hostname !== 'cdn.shopify.com' || imageUrl.search)
      throw Error('HCI_CONTRACT_INVALID');
    return {
      fabricMasterId: string(item.fabricMasterId, 150), supplierSku: string(item.supplierSku, 150),
      brand: string(item.brand, 160), design: string(item.design, 160),
      colourway: string(item.colourway, 160), imageUrl: imageUrl.toString(),
    };
  })();
  const directions = view.directions.map((candidate) => {
    const direction = object(candidate);
    fields(direction, ['id', 'label', 'purpose', 'status', 'cards', 'feedback']);
    const id = string(direction.id, 160);
    if (seen.has(id) || !Array.isArray(direction.cards) || direction.cards.length > 1) throw Error('HCI_CONTRACT_INVALID');
    seen.add(id);
    return {
      id,
      label: string(direction.label, 100),
      purpose: string(direction.purpose, 600),
      status: string(direction.status, 60),
      cards: direction.cards.map((candidate) => {
        const card = object(candidate);
        fields(card, ['fabricMasterId', 'supplierSku', 'reactionId', 'explanation']);
        if (!Array.isArray(card.explanation) || card.explanation.length > 3) throw Error('HCI_CONTRACT_INVALID');
        return { fabricMasterId: string(card.fabricMasterId, 150), supplierSku: string(card.supplierSku, 150), reactionId: string(card.reactionId, 160), explanation: card.explanation.map((line) => string(line, 1200)) };
      }),
      feedback: direction.feedback,
    };
  });
  return {
    version: HCI_PREMIUM_CONTRACT,
    sourceCommit: HCI_PREMIUM_BASELINE,
    sessionId: string(view.sessionId, 36),
    ...('revision' in view ? { revision: Number(view.revision) } : {}),
    phase: string(view.phase, 30),
    profileSummary: typeof view.profileSummary === 'string' ? view.profileSummary.slice(0, 4000) : '',
    question: view.question === null ? null : view.question,
    stimulusId: view.stimulusId === null ? null : string(view.stimulusId, 160),
    tasteProgress: progress(view.tasteProgress, 4),
    calibrationFabric: eye,
    calibrationProgress: progress(view.calibrationProgress, 8),
    palette: view.palette === null ? null : view.palette,
    directions,
    learning: view.learning === null ? null : view.learning,
    refinementDigest: view.refinementDigest === null ? null : string(view.refinementDigest, 200),
  };
}

