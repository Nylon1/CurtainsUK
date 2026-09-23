import { hciVisualKnowledge } from '@/lib/fabric-master/hci-visual-knowledge';
import 'server-only';
import { customerView } from './hci-premium-view';

import { createHash, randomUUID } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createSupplierServiceClient } from '@/lib/supabase/supplier-service';
import { fabricMasterRecommendationEligibleIds, fabricMasterRecordsByIds, listFabricMasterRecords } from '@/lib/fabric-master/repository';
import { assertNoRawReferenceMedia } from './hci-image-privacy';
import { signHciCommerceContext } from './hci-commerce-context';
import { calibrationEligibility, currentCalibrationFabric, calibrationRequestContext } from './hci-calibration';
import { currentRetailStyleDirectionEligibility, styleDirectionRequestContext } from './hci-style-directions';
import { currentRetailPriceLevelEligibility } from './hci-price-level';
import type { GuidePriceLevel } from '@/lib/fabric-master/guide-price-level';
import { acceptedHciFeedback } from './hci-feedback';
import {
  HCI_PREMIUM_BASELINE,
  premiumHciCommand,
  premiumHciEnabled,
} from './hci-premium-contract';

export { HCI_PREMIUM_BASELINE, HCI_PREMIUM_CONTRACT, PREMIUM_HCI_COOKIE, PREMIUM_HCI_MAX_AGE, premiumHciCommand, premiumHciEnabled } from './hci-premium-contract';

export function issuePremiumOwner() { return randomUUID(); }

type DirectionDelivery = { current: number; total: number };
type CustomerPresentation = ReturnType<typeof customerView> & { directionDelivery?: DirectionDelivery };
type PreparedDirectionStore = string;
type StoredCustomerState = Record<string, unknown> & {
  hciStateCompressed?: string;
  deliveryPreparedDirections?: PreparedDirectionStore;
};

function delivery(view: ReturnType<typeof customerView>, current: number, total = 3): CustomerPresentation {
  if (!Number.isSafeInteger(total) || total !== 3 || !Number.isSafeInteger(current) || current < 1 || current > total || current > view.directions.length)
    throw Error('DIRECTION_DELIVERY_INVALID');
  return { ...view, directions: [view.directions[current - 1]!], directionDelivery: { current, total } };
}

function isProgressiveStyleDirections(view: ReturnType<typeof customerView>) {
  return view.directions.length >= 1 && view.directions.length <= 3 && view.directions.every((direction) => direction.cards.length >= 5 && direction.cards.length <= 7);
}

function initialProgressiveDelivery(view: ReturnType<typeof customerView>): CustomerPresentation {
  if (!isProgressiveStyleDirections(view)) return view;
  // A resumed complete selection retains the same customer presentation:
  // Direction 1 is shown first, while the other two remain summaries until
  // explicitly opened.
  if (view.directions.length === 3) {
    return {
      ...view,
      directions: view.directions.map((direction, index) => index === 0 ? direction : { ...direction, cards: [] }),
      directionDelivery: { current: 1, total: 3 },
    };
  }
  // Retain a safe presentation for a short-lived legacy partial result. New
  // sessions never take this path.
  return delivery(view, view.directions.length);
}

/**
 * The guarded presentation column has a deliberately small customer-safe size
 * limit. Keep later directions private until the customer asks for them: their
 * bounded card payload lives in the private state column, while the durable
 * presentation holds Direction 1 plus the two direction summaries.
 */
function compactDeliveryPresentation(view: ReturnType<typeof customerView>): ReturnType<typeof customerView> {
  if (!isProgressiveStyleDirections(view) || view.directions.length < 2) return view;
  return { ...view, directions: view.directions.map((direction, index) => index === 0 ? direction : { ...direction, cards: [] }) };
}

function compressPrivateJson(value: unknown): string {
  const compressed = gzipSync(Buffer.from(JSON.stringify(value), 'utf8')).toString('base64');
  if (Buffer.byteLength(compressed) > 1_500_000) throw Error('HCI_STORAGE_UNAVAILABLE');
  return compressed;
}

function privateHciState(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const encoded = (value as StoredCustomerState).hciStateCompressed;
  // Existing sessions are replayable: only newly written state uses the
  // compact private envelope.
  if (encoded === undefined) return value as Record<string, unknown>;
  if (typeof encoded !== 'string' || Buffer.byteLength(encoded) > 1_500_000) throw Error('HCI_STORAGE_UNAVAILABLE');
  try {
    const bytes = gunzipSync(Buffer.from(encoded, 'base64'));
    if (bytes.byteLength > 4_000_000) throw Error('too large');
    const parsed = JSON.parse(bytes.toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error('not an object');
    return parsed as Record<string, unknown>;
  } catch {
    throw Error('HCI_STORAGE_UNAVAILABLE');
  }
}

function preparedDirectionStore(view: ReturnType<typeof customerView>): PreparedDirectionStore | undefined {
  if (!isProgressiveStyleDirections(view) || view.directions.length < 2) return undefined;
  // The HCI state is already private but intentionally has a hard size limit.
  // Compress only the customer-safe later-card payload so it is durable without
  // duplicating a large expanded direction object in its JSON representation.
  const compressed = gzipSync(Buffer.from(JSON.stringify(view.directions.slice(1)), 'utf8')).toString('base64');
  if (Buffer.byteLength(compressed) > 256_000) throw Error('DIRECTION_DELIVERY_REQUIRED');
  return compressed;
}

function expandPreparedDirections(view: ReturnType<typeof customerView>, state: unknown): ReturnType<typeof customerView> {
  const encoded = (state && typeof state === 'object' && !Array.isArray(state)
    ? (state as StoredCustomerState).deliveryPreparedDirections
    : undefined);
  if (!view.directions.some((direction) => direction.cards.length === 0)) return view;
  if (typeof encoded !== 'string' || Buffer.byteLength(encoded) > 256_000) throw Error('DIRECTION_DELIVERY_REQUIRED');
  let prepared: ReturnType<typeof customerView>['directions'];
  try {
    const bytes = gunzipSync(Buffer.from(encoded, 'base64'));
    if (bytes.byteLength > 1_000_000) throw Error('too large');
    prepared = customerView({ ...view, directions: JSON.parse(bytes.toString('utf8')) }).directions;
  } catch {
    throw Error('DIRECTION_DELIVERY_REQUIRED');
  }
  return {
    ...view,
    directions: view.directions.map((direction, index) => {
      if (direction.cards.length) return direction;
      const saved = prepared[index - 1];
      if (!saved || saved.id !== direction.id || saved.cards.length < 5 || saved.cards.length > 7)
        throw Error('DIRECTION_DELIVERY_REQUIRED');
      return saved;
    }),
  };
}

/**
 * HCI may project a follow-up direction either cumulatively or as the bounded
 * direction that was just prepared. Reattach the latter to the existing
 * persisted selection before it reaches CurtainsUK's delivery store.
 */
function joinPreparedDirection(
  view: ReturnType<typeof customerView>,
  prior: { presentation: unknown; private_state: unknown } | null,
  index: number,
): ReturnType<typeof customerView> {
  if (!prior || !Number.isSafeInteger(index) || index < 1 || index > 2) return view;
  if (view.directions.length > index && view.directions[index]?.cards.length) return view;
  if (view.directions.length !== 1 || view.directions[0]?.cards.length < 5 || view.directions[0]?.cards.length > 7)
    throw Error('DIRECTION_DELIVERY_REQUIRED');
  const persisted = expandPreparedDirections(customerView(prior.presentation), prior.private_state);
  if (persisted.directions.length !== index || persisted.directions.some((direction) => direction.cards.length < 5 || direction.cards.length > 7))
    throw Error('DIRECTION_DELIVERY_REQUIRED');
  return { ...view, directions: [...persisted.directions, view.directions[0]] };
}

function hydratedDirection(view: ReturnType<typeof customerView>, index: number): CustomerPresentation {
  if (!isProgressiveStyleDirections(view) || view.directions.length <= index || !Number.isSafeInteger(index) || index < 1 || index > 2)
    throw Error('DIRECTION_DELIVERY_INVALID');
  // Bounded read: only the requested persisted six-card direction reaches the
  // Fabric Master handoff. No HCI selection, calibration or catalogue work.
  return delivery(view, index + 1);
}

function preparedDirectionSummary(view: ReturnType<typeof customerView>, index: number): CustomerPresentation {
  if (!isProgressiveStyleDirections(view) || view.directions.length <= index || !Number.isSafeInteger(index) || index < 1 || index > 2)
    throw Error('DIRECTION_DELIVERY_INVALID');
  const direction = view.directions[index]!;
  return { ...view, directions: [{ ...direction, cards: [] }], directionDelivery: { current: index + 1, total: 3 } };
}

async function handoff<T extends CustomerPresentation>(view: T): Promise<T> {
  const ids = [...new Set(view.directions.flatMap((direction) => direction.cards.map((card) => card.fabricMasterId)))];
  // A completed calibration card is no longer rendered once Style Directions
  // exist. Do not add a sequential full-record read to the 18-card handoff.
  // The exact calibration-stage re-check remains unchanged when it is visible.
  if (view.calibrationFabric && !ids.length) {
    const records = await fabricMasterRecordsByIds([view.calibrationFabric.fabricMasterId]);
    view = { ...view, calibrationFabric: currentCalibrationFabric(view.calibrationFabric, records) };
  }
  // Discovery, upload and palette states have no fabric cards. Avoid a needless
  // Fabric Master round-trip until an exact recommendation needs commercial handoff.
  if (!ids.length) return view;
  const eligible = await fabricMasterRecommendationEligibleIds(ids);
  const signingSecret = process.env.CURTAINSUK_STAGING_REVIEW_SIGNING_SECRET ?? '';
  return {
    ...view,
    directions: view.directions.map((direction) => ({
      ...direction,
      cards: direction.cards.filter((card) => eligible.has(card.fabricMasterId)).map((card) => ({
        ...card,
        commerceToken: signHciCommerceContext({
          sessionId: view.sessionId,
          strategyId: direction.id,
          fabricMasterId: card.fabricMasterId,
          policyVersion: HCI_PREMIUM_BASELINE,
          recommendationVersion: view.refinementDigest ?? `initial:${view.sessionId}`,
        }, signingSecret),
      })),
    })),
  } as T;
}

/** Durable user state stays in CurtainsUK's existing guarded RPC store. HCI receives a hashed owner only. */
export async function premiumHciIntegration(owner: string, value: unknown) {
  if (!premiumHciEnabled()) throw Error('HCI_DISABLED');
  const command = premiumHciCommand(value);
  const directionPrepare = command.action?.type === 'direction-prepare';
  // Preparing a later saved direction remains a server-to-server HCI command.
  // The browser receives only its summary; it never receives or hydrates the
  // six cards until the customer explicitly opens that direction.
  const upstreamAction = directionPrepare
    ? { type: 'direction-load' as const, index: Number(command.action!.index) }
    : command.action;
  const db = createSupplierServiceClient();
  const digest = createHash('sha256').update(JSON.stringify(command)).digest('hex');
  const { data: prior, error: readError } = await db.rpc('hci_staging_read', { p_owner: owner, p_session: command.sessionId, p_request: command.requestId });
  if (readError) throw Error('HCI_STORAGE_UNAVAILABLE');
  const priorHciState = privateHciState(prior?.private_state);
  if (!prior && command.sessionId !== command.requestId) throw Error('HCI_SESSION_CONFLICT');
  if (prior?.request_id === command.requestId) {
    if (prior.request_digest !== digest) throw Error('HCI_SESSION_CONFLICT');
    const persisted = customerView(prior.presentation);
    const expanded = expandPreparedDirections(persisted, prior.private_state);
    return handoff(command.action?.type === 'brief-confirm' || command.action?.type === 'direction-load' ? initialProgressiveDelivery(persisted) : directionPrepare ? preparedDirectionSummary(expanded, Number(command.action!.index)) : persisted);
  }
  if (prior && !command.action) return handoff(initialProgressiveDelivery(customerView(prior.presentation)));
  const expected = prior?.revision ?? -1;
  if ((prior && command.revision !== expected) || (!prior && command.revision !== null)) throw Error('HCI_SESSION_CONFLICT');
  if (command.action?.type === 'direction-hydrate') {
    if (!prior) throw Error('DIRECTION_DELIVERY_REQUIRED');
    return handoff(hydratedDirection(expandPreparedDirections(customerView(prior.presentation), prior.private_state), Number(command.action.index)));
  }
  if (command.action?.type === 'outcome') {
    const priorView = expandPreparedDirections(customerView(prior?.presentation), prior?.private_state);
    const direction = priorView.directions.find((entry) => entry.id === command.action!.strategyId);
    if (!direction?.cards.some((card) => card.fabricMasterId === command.action!.fabricMasterId)) throw Error('HCI_CONTEXT_INVALID');
    const event = { event: command.action.event, sessionId: command.sessionId, strategyId: command.action.strategyId, fabricMasterId: command.action.fabricMasterId, policyVersion: HCI_PREMIUM_BASELINE, recommendationVersion: priorView.refinementDigest ?? `initial:${command.sessionId}`, timestamp: new Date().toISOString() };
    const { data, error } = await db.rpc('hci_staging_commit', { p_owner: owner, p_session: command.sessionId, p_request: command.requestId, p_digest: digest, p_expected: expected, p_state: { ...prior.private_state, commerceEvents: [...(prior.private_state.commerceEvents ?? []), event] }, p_view: { ...prior.presentation, revision: expected + 1 } });
    if (error) throw Error('HCI_STORAGE_UNAVAILABLE');
    return handoff(customerView(data));
  }
  const endpoint = new URL(process.env.CURTAINSUK_HCI_PREMIUM_SERVICE_URL ?? 'https://invalid.invalid');
  const secret = process.env.CURTAINSUK_HCI_SERVICE_TOKEN ?? '';
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.hostname === 'invalid.invalid' || secret.length < 32)
    throw Error('HCI_CONFIGURATION_INVALID');
  const priorPriceLevel = priorHciState?.priceLevel;
  const selectedPriceLevel: GuidePriceLevel | undefined = command.action?.type === 'price-level'
    ? command.action.level as GuidePriceLevel
    : ['MID_RANGE', 'LUXURY', 'PREMIUM_LUXURY', 'SUPER_LUXURY'].includes(priorPriceLevel as string)
      ? priorPriceLevel as GuidePriceLevel
      : undefined;
  const priceLevelEligibilityIds = selectedPriceLevel
    ? await currentRetailPriceLevelEligibility(selectedPriceLevel)
    : undefined;
  const knowledgeEnabled = !prior || prior.private_state?.visualKnowledgePolicy === 'visual-vocabulary-v1';
  // The active price-level cohort is the only catalogue that can participate
  // in Calibration or Style Directions. Keep the existing governed visual
  // evidence, but do not send every other tier through the live request.
  const visualKnowledge = knowledgeEnabled && priceLevelEligibilityIds
    ? await hciVisualKnowledge(priceLevelEligibilityIds)
    : undefined;
  const calibration = calibrationRequestContext(priorHciState, upstreamAction);
  const calibrationEligibilityIds = calibration.needsEligibility
    ? calibrationEligibility(await listFabricMasterRecords({ stagingCatalogOnly: true })) : undefined;
  const styleDirections = styleDirectionRequestContext(priorHciState, upstreamAction);
  const styleDirectionEligibilityIds = styleDirections.needsEligibility
    // Price Level is already a hard candidate boundary. Apply the existing
    // retail-image/readiness gate within that exact cohort, rather than
    // loading the full catalogue and intersecting it afterwards.
    ? await currentRetailStyleDirectionEligibility(priceLevelEligibilityIds) : undefined;
  const upstream = await fetch(endpoint, {
    method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(25000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}`, 'x-vercel-protection-bypass': process.env.CURTAINSUK_HCI_PLATFORM_TOKEN ?? '' },
    body: JSON.stringify({ calibrationPolicy: calibration.policy, calibrationEligibility: calibrationEligibilityIds, styleDirectionEligibility: styleDirectionEligibilityIds, priceLevelEligibility: priceLevelEligibilityIds, visualKnowledge, sourceCommit: HCI_PREMIUM_BASELINE, sessionId: command.sessionId, owner: createHash('sha256').update(`curtainsuk:premium:${owner}`).digest('hex'), state: priorHciState, action: upstreamAction, recordedAt: new Date().toISOString() }),
  });
  if (!upstream.ok) {
    // Operationally useful without logging a photograph, session state, URL or credentials.
    console.error('CurtainsUK premium HCI upstream rejected a request', { status: upstream.status });
    throw Error('HCI_SERVICE_UNAVAILABLE');
  }
  const result = await upstream.json();
  assertNoRawReferenceMedia(result?.state);
  let projected: ReturnType<typeof customerView>;
  try {
    projected = customerView(result?.view);
  } catch {
    throw Error('HCI_CONTRACT_VIEW');
  }
  let view: ReturnType<typeof customerView> & { revision: number } = { ...projected, revision: expected + 1 };
  if (directionPrepare) view = { ...joinPreparedDirection(view, prior, Number(command.action!.index)), revision: expected + 1 };
  if (view.sessionId !== command.sessionId || result?.state?.consultation?.sessionId !== command.sessionId || result?.state?.consultation?.owner !== createHash('sha256').update(`curtainsuk:premium:${owner}`).digest('hex'))
    throw Error('HCI_CONTRACT_STATE');
  const feedbackEvents = acceptedHciFeedback({
    sessionId: command.sessionId,
    policyVersion: HCI_PREMIUM_BASELINE,
    recommendationVersion: view.refinementDigest ?? `initial:${command.sessionId}`,
    timestamp: new Date().toISOString(),
    action: command.action,
    directions: prior ? expandPreparedDirections(customerView(prior.presentation), prior.private_state).directions : undefined,
  });
  const deliveryState = preparedDirectionStore(view);
  // A later direction is a read of the already-confirmed brief. Preserve the
  // compact post-brief HCI state rather than writing the upstream's cumulative
  // response state again; its selected six cards are persisted separately below.
  const hciStateCompressed = directionPrepare && typeof prior?.private_state?.hciStateCompressed === 'string'
    ? prior.private_state.hciStateCompressed
    : compressPrivateJson(result.state);
  const storedState: StoredCustomerState = {
    hciStateCompressed,
    ...(knowledgeEnabled ? { visualKnowledgePolicy: 'visual-vocabulary-v1' } : {}),
    ...(deliveryState ? { deliveryPreparedDirections: deliveryState } : {}),
    commerceEvents: [...(prior?.private_state?.commerceEvents ?? []), ...feedbackEvents],
  };
  const storedView = compactDeliveryPresentation(view);
  const { data, error } = await db.rpc('hci_staging_commit', { p_owner: owner, p_session: command.sessionId, p_request: command.requestId, p_digest: digest, p_expected: expected, p_state: storedState, p_view: storedView });
  if (error) throw Error(error.message.includes('HCI_SESSION_CONFLICT') ? 'HCI_SESSION_CONFLICT' : 'HCI_STORAGE_UNAVAILABLE');
  const persisted = customerView(data);
  return handoff(command.action?.type === 'brief-confirm' || command.action?.type === 'direction-load' ? initialProgressiveDelivery(persisted) : directionPrepare ? preparedDirectionSummary(expandPreparedDirections(persisted, storedState), Number(command.action!.index)) : persisted);
}
