import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { base, origin, results } from './target.mjs';

const rows = [];
const evidencePath = new URL('edge-results.json', results);
async function request(label, url, { body, expect } = {}) {
  const started = performance.now();
  const response = await fetch(url, { method: body ? 'POST' : 'GET', cache: 'no-store',
    signal: AbortSignal.timeout(40_000), headers: { Origin: origin, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  let data;
  try { data = await response.json(); } catch { data = {}; }
  const row = { label, status: response.status, roundTripMs: Math.round(performance.now() - started),
    gatewayDurationMs: null, hciResult: response.ok && url.includes('premium-command') ? 'accepted-via-gateway' : 'not-applicable',
    phase: data.phase ?? null, revision: data.revision ?? null, question: data.question?.id ?? null,
    error: data.error ?? null };
  rows.push(row);
  if (row.roundTripMs > 20_000) row.flag = 'OVER_20_SECONDS';
  if (expect && !expect.includes(response.status)) throw Error(`${label}: HTTP ${response.status}, expected ${expect}`);
  return data;
}
function payload(capability, view, requestId, action) {
  return { capability, command: { requestId, sessionId: view?.sessionId ?? null,
    revision: view?.revision ?? null, ...(action ? { action } : {}) } };
}
const commandUrl = base + '/apps/curtainsuk-decision/premium-command';
const call = (label, body, expect = [200]) => request(label, commandUrl, { body, expect });
async function save(verdict, error = null) {
  await writeFile(evidencePath, JSON.stringify({ checkedAt: new Date().toISOString(), verdict,
    rows, ...(error ? { error: String(error) } : {}) }, null, 2));
}

try {
  const session = await request('edge:capability', base + '/apps/curtainsuk-decision/premium-session', { body: {}, expect: [200] });
  let view = await call('edge:start', payload(session.capability, null, randomUUID()));
  const old = view;
  const answer = { type: 'answer', questionId: view.question.id, answerId: view.question.answers[0].id };
  const requestId = randomUUID();
  const exact = payload(session.capability, old, requestId, answer);
  view = await call('edge:first-answer', exact);
  const committed = view;
  const retry = await call('edge:exact-request-retry', exact);
  if (retry.revision !== committed.revision || retry.question?.id !== committed.question?.id)
    throw Error('Exact-request retry changed committed state');
  await call('edge:stale-tab-new-request', payload(session.capability, old, randomUUID(), answer), [409]);
  view = await call('edge:resume-after-conflict', payload(session.capability, committed, randomUUID()));
  if (view.revision !== committed.revision) throw Error('Stale request changed saved revision');
  while (view.phase === 'discovery') {
    const next = { type: 'answer', questionId: view.question.id, answerId: view.question.answers[0].id };
    view = await call(`edge:answer:${next.questionId}`, payload(session.capability, view, randomUUID(), next));
  }
  if (view.phase !== 'price') throw Error('FI discovery changed after retry');
  const priceRequest = payload(session.capability, view, randomUUID(), { type: 'price-level', level: 'MID_RANGE' });
  view = await call('edge:price', priceRequest);
  if (view.phase !== 'calibration') throw Error('Price did not reach calibration');
  const priceRetry = await call('edge:price-exact-retry', priceRequest);
  if (priceRetry.revision !== view.revision || priceRetry.phase !== view.phase) throw Error('Price retry changed committed state');
  await request('edge:ordinary-browse-during-consultation', base + '/apps/curtainsuk-decision/catalog?view=retail&browseGuide=1', { expect: [200] });
  await request('edge:samples-during-consultation', base + '/pages/samples', { expect: [200] });
  await request('edge:make-curtains-page-during-consultation', base + '/pages/curtain-visualiser', { expect: [200] });
  await new Promise(resolve => setTimeout(resolve, 5_000));
  const resumed = await call('edge:abandoned-resume', payload(session.capability, view, randomUUID()));
  if (resumed.revision !== view.revision || resumed.phase !== 'calibration') throw Error('Abandoned session did not resume');
  await call('edge:invalid-capability', payload('invalid', view, randomUUID()), [401]);
  if (process.env.CUK_RELEASE_MATRIX_DIRECT_GATEWAY) {
    await request('edge:unsigned-direct-proxy',
      new URL('/api/staging/shopify-proxy/premium-session', process.env.CUK_RELEASE_MATRIX_DIRECT_GATEWAY).toString(),
      { body: {}, expect: [401, 403] });
  } else {
    rows.push({ label: 'edge:unsigned-direct-proxy', status: 'SKIP', reason: 'CUK_RELEASE_MATRIX_DIRECT_GATEWAY not supplied' });
  }
  await save('PASS');
  console.log(JSON.stringify({ verdict: 'PASS', requests: rows.length, maxMs: Math.max(...rows.map(row => row.roundTripMs)) }));
} catch (error) {
  await save('FAIL', error);
  console.error(JSON.stringify({ verdict: 'FAIL', at: rows.at(-1)?.label, error: String(error) }));
  process.exitCode = 1;
}
