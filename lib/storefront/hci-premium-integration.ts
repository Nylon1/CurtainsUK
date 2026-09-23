import { hciVisualKnowledge } from '@/lib/fabric-master/hci-visual-knowledge';
import 'server-only';
import { customerView } from './hci-premium-view';

import { createHash, randomUUID } from 'node:crypto';
import { createSupplierServiceClient } from '@/lib/supabase/supplier-service';
import { fabricMasterRecommendationEligibleIds, fabricMasterRecordsByIds, listFabricMasterRecords } from '@/lib/fabric-master/repository';
import { assertNoRawReferenceMedia } from './hci-image-privacy';
import { signHciCommerceContext } from './hci-commerce-context';
import { calibrationEligibility, currentCalibrationFabric, calibrationRequestContext } from './hci-calibration';
import { currentRetailStyleDirectionEligibility, styleDirectionRequestContext } from './hci-style-directions';
import { currentRetailPriceLevelEligibility } from './hci-price-level';
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
  if (!prior && command.sessionId !== command.requestId) throw Error('HCI_SESSION_CONFLICT');
  if (prior?.request_id === command.requestId) {
    if (prior.request_digest !== digest) throw Error('HCI_SESSION_CONFLICT');
    const persisted = customerView(prior.presentation);
    return handoff(command.action?.type === 'brief-confirm' || command.action?.type === 'direction-load' ? initialProgressiveDelivery(persisted) : directionPrepare ? preparedDirectionSummary(persisted, Number(command.action!.index)) : persisted);
  }
  if (prior && !command.action) return handoff(initialProgressiveDelivery(customerView(prior.presentation)));
  const expected = prior?.revision ?? -1;
  if ((prior && command.revision !== expected) || (!prior && command.revision !== null)) throw Error('HCI_SESSION_CONFLICT');
  if (command.action?.type === 'direction-hydrate') {
    if (!prior) throw Error('DIRECTION_DELIVERY_REQUIRED');
    return handoff(hydratedDirection(customerView(prior.presentation), Number(command.action.index)));
  }
  if (command.action?.type === 'outcome') {
    const priorView = customerView(prior?.presentation);
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
  const selectedPriceLevel = command.action?.type === 'price-level'
    ? command.action.level
    : prior?.private_state?.priceLevel;
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
  const calibration = calibrationRequestContext(prior?.private_state, upstreamAction);
  const calibrationEligibilityIds = calibration.needsEligibility
    ? calibrationEligibility(await listFabricMasterRecords({ stagingCatalogOnly: true })) : undefined;
  const styleDirections = styleDirectionRequestContext(prior?.private_state, upstreamAction);
  const styleDirectionEligibilityIds = styleDirections.needsEligibility
    // Price Level is already a hard candidate boundary. Apply the existing
    // retail-image/readiness gate within that exact cohort, rather than
    // loading the full catalogue and intersecting it afterwards.
    ? await currentRetailStyleDirectionEligibility(priceLevelEligibilityIds) : undefined;
  const upstream = await fetch(endpoint, {
    method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(25000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}`, 'x-vercel-protection-bypass': process.env.CURTAINSUK_HCI_PLATFORM_TOKEN ?? '' },
    body: JSON.stringify({ calibrationPolicy: calibration.policy, calibrationEligibility: calibrationEligibilityIds, styleDirectionEligibility: styleDirectionEligibilityIds, priceLevelEligibility: priceLevelEligibilityIds, visualKnowledge, sourceCommit: HCI_PREMIUM_BASELINE, sessionId: command.sessionId, owner: createHash('sha256').update(`curtainsuk:premium:${owner}`).digest('hex'), state: prior?.private_state ?? null, action: upstreamAction, recordedAt: new Date().toISOString() }),
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
  const view = { ...projected, revision: expected + 1 };
  if (view.sessionId !== command.sessionId || result?.state?.consultation?.sessionId !== command.sessionId || result?.state?.consultation?.owner !== createHash('sha256').update(`curtainsuk:premium:${owner}`).digest('hex'))
    throw Error('HCI_CONTRACT_STATE');
  const feedbackEvents = acceptedHciFeedback({
    sessionId: command.sessionId,
    policyVersion: HCI_PREMIUM_BASELINE,
    recommendationVersion: view.refinementDigest ?? `initial:${command.sessionId}`,
    timestamp: new Date().toISOString(),
    action: command.action,
    directions: prior?.presentation?.directions,
  });
  const { data, error } = await db.rpc('hci_staging_commit', { p_owner: owner, p_session: command.sessionId, p_request: command.requestId, p_digest: digest, p_expected: expected, p_state: { ...result.state, ...(knowledgeEnabled ? { visualKnowledgePolicy: 'visual-vocabulary-v1' } : {}), commerceEvents: [...(prior?.private_state?.commerceEvents ?? []), ...feedbackEvents] }, p_view: view });
  if (error) throw Error(error.message.includes('HCI_SESSION_CONFLICT') ? 'HCI_SESSION_CONFLICT' : 'HCI_STORAGE_UNAVAILABLE');
  const persisted = customerView(data);
  return handoff(command.action?.type === 'brief-confirm' || command.action?.type === 'direction-load' ? initialProgressiveDelivery(persisted) : directionPrepare ? preparedDirectionSummary(persisted, Number(command.action!.index)) : persisted);
}
