import { hciVisualKnowledge } from '@/lib/fabric-master/hci-visual-knowledge';
import 'server-only';
import { customerView } from './hci-premium-view';

import { createHash, randomUUID } from 'node:crypto';
import { createSupplierServiceClient } from '@/lib/supabase/supplier-service';
import { fabricMasterRecordsByIds } from '@/lib/fabric-master/repository';
import { fabricReadiness } from '@/lib/fabric-master/readiness';
import { assertNoRawReferenceMedia } from './hci-image-privacy';
import { signHciCommerceContext } from './hci-commerce-context';
import { acceptedHciFeedback } from './hci-feedback';
import {
  HCI_PREMIUM_BASELINE,
  premiumHciCommand,
  premiumHciEnabled,
} from './hci-premium-contract';

export { HCI_PREMIUM_BASELINE, HCI_PREMIUM_CONTRACT, PREMIUM_HCI_COOKIE, PREMIUM_HCI_MAX_AGE, premiumHciCommand, premiumHciEnabled } from './hci-premium-contract';

export function issuePremiumOwner() { return randomUUID(); }

async function handoff(view: ReturnType<typeof customerView>) {
  const ids = [...new Set(view.directions.flatMap((direction) => direction.cards.map((card) => card.fabricMasterId)))];
  // Discovery, upload and palette states have no fabric cards. Avoid a needless
  // Fabric Master round-trip until an exact recommendation needs commercial handoff.
  if (!ids.length) return view;
  const records = await fabricMasterRecordsByIds(ids);
  const eligible = new Set(records.filter((record) => fabricReadiness(record).recommendationEligible).map((record) => record.fabric_id));
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
  };
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
  if (prior?.request_id === command.requestId) {
    if (prior.request_digest !== digest) throw Error('HCI_SESSION_CONFLICT');
    return handoff(customerView(prior.presentation));
  }
  if (prior && !command.action) return handoff(customerView(prior.presentation));
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
  const upstream = await fetch(endpoint, {
    method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(25000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}`, 'x-vercel-protection-bypass': process.env.CURTAINSUK_HCI_PLATFORM_TOKEN ?? '' },
    body: JSON.stringify({ visualKnowledge, sourceCommit: HCI_PREMIUM_BASELINE, sessionId: command.sessionId, owner: createHash('sha256').update(`curtainsuk:premium:${owner}`).digest('hex'), state: prior?.private_state ?? null, action: command.action, recordedAt: new Date().toISOString() }),
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
  const { data, error } = await db.rpc('hci_staging_commit', { p_owner: owner, p_session: command.sessionId, p_request: command.requestId, p_digest: digest, p_expected: expected, p_state: { ...result.state, ...(knowledgeEnabled ? {visualKnowledgePolicy:'visual-vocabulary-v1'} : {}), commerceEvents: [...(prior?.private_state?.commerceEvents ?? []), ...feedbackEvents] }, p_view: view });
  if (error) throw Error(error.message.includes('HCI_SESSION_CONFLICT') ? 'HCI_SESSION_CONFLICT' : 'HCI_STORAGE_UNAVAILABLE');
  return handoff(customerView(data));
}
