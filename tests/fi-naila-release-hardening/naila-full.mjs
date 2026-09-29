import { randomUUID, createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { base, origin, results } from './target.mjs';

const rows = [];
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function request(label, path, body) {
  const started = performance.now();
  const response = await fetch(base + path, { method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(40_000),
    headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const view = await response.json();
  rows.push({ label, status: response.status, roundTripMs: Math.round(performance.now() - started),
    requestId: response.headers.get('x-request-id') ?? null,
    gatewayDurationMs: null, hciResult: response.ok ? 'accepted-via-gateway' : 'unknown',
    phase: view.phase ?? null, revision: view.revision ?? null, question: view.question?.id ?? null,
    error: view.error ?? null });
  if (!response.ok) throw Error(`${label}: HTTP ${response.status}`);
  return view;
}
async function save(verdict, extra = {}) {
  await writeFile(new URL('naila-full-results.json', results), JSON.stringify({
    checkedAt: new Date().toISOString(), verdict, rows, ...extra }, null, 2));
}

let sessionId = null;
try {
  const session = await request('capability', '/apps/curtainsuk-decision/premium-session', {});
  let view;
  const act = async (label, action) => {
    view = await request(label, '/apps/curtainsuk-decision/premium-command', { capability: session.capability,
      command: { requestId: randomUUID(), sessionId: view?.sessionId ?? null, revision: view?.revision ?? null,
        ...(action ? { action } : {}) }, presentation: 'naila-v1' });
    sessionId = view.sessionId;
    if (!view.naila) throw Error(`${label}: Naila state absent`);
    return view;
  };
  await act('start');
  for (const questionId of ['curtain-priority', 'atmosphere', 'colour-family', 'pattern']) {
    if (view.question?.id !== questionId) throw Error(`Naila question order changed at ${questionId}`);
    await act(`answer:${questionId}`, { type: 'answer', questionId, answerId: view.question.answers[0].id });
  }
  if (view.phase !== 'price') throw Error('Naila did not reach price');
  await act('price:MID_RANGE', { type: 'price-level', level: 'MID_RANGE' });
  if (view.phase !== 'calibration') throw Error('Naila did not reach calibration');
  for (let i = 0; i < 6; i++) await act(`calibrate:${i + 1}`, { type: 'calibrate', reaction: 'LIKE' });
  if (view.phase !== 'brief') throw Error('Naila did not reach brief');
  await act('brief-confirm', { type: 'brief-confirm', id: randomUUID() });
  const first = structuredClone(view.directions?.[0]);
  if (!first || first.cards.length < 5 || first.cards.length > 7) throw Error('Naila Direction 1 invalid');
  const firstSha256 = sha(first.cards.map(card => card.fabricMasterId));
  await act('direction2-prepare', { type: 'direction-prepare', index: 1 });
  await act('direction2-hydrate', { type: 'direction-hydrate', index: 1 });
  const second = structuredClone(view.directions?.[0]);
  if (!second || second.cards.length < 5 || second.cards.length > 7) throw Error('Naila Direction 2 invalid');
  const secondSha256 = sha(second.cards.map(card => card.fabricMasterId));
  await act('resume-directions');
  await act('direction2-rehydrate', { type: 'direction-hydrate', index: 1 });
  if (sha(view.directions?.[0]?.cards?.map(card => card.fabricMasterId)) !== secondSha256)
    throw Error('Naila Direction 2 ordering changed on resume');
  const card = second.cards[0];
  await act('feedback-direction2', { type: 'feedback', command: { id: randomUUID(),
    strategyId: second.id, fabricId: card.reactionId, fabricReaction: 'LOVE', directionReaction: 'LOVE', optionIds: [] } });
  await act('finish', { type: 'finish' });
  if (view.phase !== 'final') throw Error('Naila did not reach final');
  await act('resume-final');
  if (view.phase !== 'final') throw Error('Naila final resume failed');
  await save('PASS', { sessionId, firstDirectionSha256: firstSha256, secondDirectionSha256: secondSha256,
    finalPhase: view.phase, finalRevision: view.revision, totalRoundTripMs: rows.reduce((sum, row) => sum + row.roundTripMs, 0) });
  console.log(JSON.stringify({ verdict: 'PASS', requests: rows.length, maxMs: Math.max(...rows.map(row => row.roundTripMs)), phase: view.phase }));
} catch (error) {
  await save('FAIL', { sessionId, error: String(error) });
  console.error(JSON.stringify({ verdict: 'FAIL', at: rows.at(-1)?.label, error: String(error) }));
  process.exitCode = 1;
}
