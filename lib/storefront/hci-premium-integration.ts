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

function delivery(view: ReturnType<typeof customerView>, current: number): CustomerPresentation {
  const total = view.directions.length;
  if (!total || total > 3 || !Number.isSafeInteger(current) || current < 0 || current > total)
    throw Error('DIRECTION_DELIVERY_INVALID');
  return { ...view, directions: current === 0 ? [] : [view.directions[current - 1]!], directionDelivery: { current, total } };
}

function isProgressiveStyleDirections(view: ReturnType<typeof customerView>) {
  return view.directions.length === 3 && view.directions.every((direction) => direction.cards.length >= 5 && direction.cards.length <= 7);
}

function initialDelivery(view: ReturnType<typeof customerView>): CustomerPresentation {
  return isProgressiveStyleDirections(view) ? delivery(view, 0) : view;
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
  const db = createSupplierServiceClient();
  const digest = createHash('sha256').update(JSON.stringify(command)).digest('hex');
  const { data: prior, error: readError } = await db.rpc('hci_staging_read', { p_owner: owner, p_session: command.sessionId, p_request: command.requestId });
  if (readError) throw Error('HCI_STORAGE_UNAVAILABLE');
  if (!prior && command.sessionId !== command.requestId) throw Error('HCI_SESSION_CONFLICT');
  // Style Directions are selected and persisted as one governed result. Delivery is
  // intentionally incremental so the customer receives the first six exact fabrics
  // without waiting for all 18 commercial projections to be hydrated.
  if (prior && command.action?.type === 'direction-load') {
    const persisted = customerView(prior.presentation);
    if (!isProgressiveStyleDirections(persisted)) throw Error('DIRECTION_DELIVERY_UNAVAILABLE');
    return handoff(delivery(persisted, Number(command.action.index) + 1));
  }
  if (prior?.request_id === command.requestId) {
    if (prior.request_digest !== digest) throw Error('HCI_SESSION_CONFLICT');
    const persisted = customerView(prior.presentation);
    return handoff(command.action?.type === 'brief-confirm' ? initialDelivery(persisted) : persisted);
  }
  if (prior && !command.action) return handoff(initialDelivery(customerView(prior.presentation)));
  const expected = prior?.revision ?? -1;
  if ((prior && command.revision !== expected) || (!prior && command.revision !== null)) throw Error('HCI_SESSION_CONFLICT');
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
  const knowledgeEnabled = !prior || prior.private_state?.visualKnowledgePolicy === 'visual-vocabulary-v1';
  const visualKnowledge = knowledgeEnabled ? await hciVisualKnowledge() : undefined;
  const calibration = calibrationRequestContext(prior?.private_state, command.action);
  const calibrationEligibilityIds = calibration.needsEligibility
    ? calibrationEligibility(await listFabricMasterRecords({ stagingCatalogOnly: true })) : undefined;
  const styleDirections = styleDirectionRequestContext(prior?.private_state, command.action);
  const selectedPriceLevel = command.action?.type === 'price-level'
    ? command.action.level
    : prior?.private_state?.priceLevel;
  const priceLevelEligibilityIds = selectedPriceLevel
    ? await currentRetailPriceLevelEligibility(selectedPriceLevel)
    : undefined;
  const styleDirectionEligibilityIds = styleDirections.needsEligibility
    ? await currentRetailStyleDirectionEligibility() : undefined;
  const upstream = await fetch(endpoint, {
    method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(25000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}`, 'x-vercel-protection-bypass': process.env.CURTAINSUK_HCI_PLATFORM_TOKEN ?? '' },
    body: JSON.stringify({ calibrationPolicy: calibration.policy, calibrationEligibility: calibrationEligibilityIds, styleDirectionEligibility: styleDirectionEligibilityIds, priceLevelEligibility: priceLevelEligibilityIds, visualKnowledge, sourceCommit: HCI_PREMIUM_BASELINE, sessionId: command.sessionId, owner: createHash('sha256').update(`curtainsuk:premium:${owner}`).digest('hex'), state: prior?.private_state ?? null, action: command.action, recordedAt: new Date().toISOString() }),
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
  return handoff(command.action?.type === 'brief-confirm' ? initialDelivery(persisted) : persisted);
}
