import { randomUUID, createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { base, origin, results } from './target.mjs';
import { reactions, prices, questionsFI, questionsNaila, pairwiseCases } from './matrix.mjs';

// Controlled, sequential synthetic sessions through the real Shopify app proxy.
// Keep capabilities and complete customer views in memory only.
const root = new URL('.', import.meta.url);
const rows = [];
const cases = [];
const sessionIndex = [];
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function flush(status = 'RUNNING', error = null) {
  const document = { checkedAt: new Date().toISOString(), status,
    target: base,
    rowCount: rows.length, cases, rows, sessionIndex,
    ...(error ? { error: String(error) } : {}) };
  await writeFile(new URL('live-results.json', results), JSON.stringify(document, null, 2));
}

async function call(label, path, { method = 'GET', body, headers = {}, expect = 200 } = {}) {
  const started = performance.now();
  let response, data;
  try {
    response = await fetch(base + path, { method, cache: 'no-store', signal: AbortSignal.timeout(40_000),
      headers: { Origin: origin, ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    const raw = await response.text();
    try { data = JSON.parse(raw); } catch { data = { html: /<html/i.test(raw) }; }
  } catch (error) {
    rows.push({ label, status: 'NETWORK_ERROR', roundTripMs: Math.round(performance.now() - started), error: String(error) });
    await flush('FAIL', error);
    throw error;
  }
  const row = { label, status: response.status, roundTripMs: Math.round(performance.now() - started),
    gatewayDurationMs: null, hciResult: path.includes('premium-command') ? (response.ok ? 'accepted-via-gateway' : 'unknown') : 'not-applicable',
    requestId: response.headers.get('x-request-id') ?? response.headers.get('x-vercel-id') ?? null,
    phase: data.phase ?? null, revision: data.revision ?? null, question: data.question?.id ?? null,
    calibrationProgress: data.calibrationProgress ?? null,
    directionCardOrderSha256: data.directions?.map(direction => sha(direction.cards?.map(card => card.fabricMasterId))) ?? null,
    error: data.error ?? null };
  if (path.includes('/catalog')) Object.assign(row, { browseSource: data.preparedBrowse?.source ?? null, total: data.total ?? null });
  rows.push(row);
  if (row.roundTripMs > 20_000) row.flag = 'OVER_20_SECONDS';
  if (response.status !== expect) {
    await flush('FAIL', `${label}: expected ${expect}, got ${response.status}`);
    throw Error(`${label}: HTTP ${response.status}, expected ${expect}, error ${String(data.error ?? '')}`);
  }
  return data;
}

async function newSession() {
  const result = await call('session-capability', '/apps/curtainsuk-decision/premium-session', { method: 'POST', body: {} });
  if (typeof result.capability !== 'string') throw Error('Capability absent');
  return result.capability;
}

async function command(label, capability, view, action, naila = false, requestId = randomUUID(), expect = 200) {
  const request = { capability, command: { requestId, sessionId: view?.sessionId ?? null,
    revision: view?.revision ?? null, ...(action ? { action } : {}) }, ...(naila ? { presentation: 'naila-v1' } : {}) };
  return call(label, '/apps/curtainsuk-decision/premium-command', { method: 'POST', body: request, expect });
}

async function resume(label, capability, view, naila = false) {
  const copy = await command(label, capability, view, undefined, naila);
  if (copy.revision !== view.revision || copy.phase !== view.phase) throw Error(`${label}: resume changed saved progress`);
  return copy;
}

async function answerQuestions(label, capability, view, expected, naila = false) {
  for (const questionId of expected) {
    if (view.phase !== 'discovery' || view.question?.id !== questionId) throw Error(`${label}: unexpected question ${view.question?.id}`);
    const answerId = view.question.answers?.[0]?.id;
    if (!answerId) throw Error(`${label}: no governed option`);
    const priorRevision = view.revision;
    view = await command(`${label}:answer:${questionId}`, capability, view, { type: 'answer', questionId, answerId }, naila);
    if (view.revision !== priorRevision + 1) throw Error(`${label}: answer revision did not advance once`);
  }
  if (view.phase !== 'price') throw Error(`${label}: missing price phase`);
  return view;
}

async function paletteReview(capability, view) {
  const edit = async (type, fields = {}) => {
    const prior = view.revision;
    view = await command(`palette:${type}`, capability, view, { type: 'palette', edit: {
      id: randomUUID(), revision: view.palette.state.revision, type, ...fields } });
    if (view.revision !== prior + 1) throw Error(`Palette ${type} revision`);
  };
  await edit('begin-review');
  const original = structuredClone(view.palette.state.palette);
  let changed = false;
  for (const role of ['primary', 'secondary', 'accent']) {
    for (const colour of [...(original[role] ?? [])]) {
      let selected = colour;
      if (!changed && colour !== 'blue') { selected = 'blue'; changed = true; }
      await edit('review-colour', { previousColour: colour, colour: selected, category: role,
        feature: role === 'primary' ? 'walls' : 'accessories', influence: role === 'primary' ? 'important' : role === 'secondary' ? 'consider' : 'ignore' });
    }
  }
  await edit('complete-review');
  const confirmed = structuredClone(view.palette.state.confirmedPalette);
  const confirmedSha256 = sha(confirmed);
  view = await resume('palette:resume', capability, view);
  if (sha(view.palette.state.confirmedPalette) !== confirmedSha256) throw Error('Confirmed palette lost on resume');
  return { view, confirmedSha256, corrected: changed };
}

async function startFI(label, { image = false, price = 'MID_RANGE', answerResume = false } = {}) {
  const capability = await newSession();
  let view = await command(`${label}:start`, capability, null);
  const sessionId = view.sessionId;
  let palette = null;
  if (image) {
    const bytes = await readFile(new URL('../../public/reference-experience/living-room.jpg', root));
    view = await command(`${label}:image`, capability, view, { type: 'image', mime: 'image/jpeg', referenceType: 'room', bytes: bytes.toString('base64') });
    palette = await paletteReview(capability, view);
    view = palette.view;
  }
  if (answerResume) view = await resume(`${label}:discovery-resume`, capability, view);
  view = await answerQuestions(label, capability, view, questionsFI);
  if (answerResume) view = await resume(`${label}:price-resume`, capability, view);
  const priceBefore = view.revision;
  view = await command(`${label}:price:${price}`, capability, view, { type: 'price-level', level: price });
  if (view.phase !== 'calibration' || view.revision !== priceBefore + 1) throw Error(`${label}: price did not enter calibration`);
  return { label, capability, view, sessionId, price, image, palette };
}

async function calibrate(fi, sequence, { resumeHalfway = false } = {}) {
  let { view } = fi;
  const startingRevision = view.revision;
  const revisionHistory = [];
  const fabricHistory = [];
  for (let i = 0; i < 6; i++) {
    if (view.phase !== 'calibration') throw Error(`${fi.label}: calibration ended early at ${i}`);
    fabricHistory.push(view.calibrationFabric?.fabricMasterId ?? null);
    const prior = view.revision;
    view = await command(`${fi.label}:calibrate:${i + 1}:${sequence[i]}`, fi.capability, view,
      { type: 'calibrate', reaction: sequence[i] });
    revisionHistory.push(view.revision);
    if (view.revision !== prior + 1) throw Error(`${fi.label}: calibration revision ${i + 1} did not advance exactly once`);
    if (resumeHalfway && i === 2) view = await resume(`${fi.label}:calibration-resume`, fi.capability, view);
  }
  if (view.phase !== 'brief') throw Error(`${fi.label}: six events did not reach brief`);
  fi.view = view;
  fi.sequence = sequence;
  fi.calibration = { startingRevision, revisionHistory, fabricHistory, finalProfileSha256: sha(view.profileSummary ?? null) };
  return fi;
}

async function directions(fi, { feedback = null, feedbackDirection = 1, checkResume = true, commerce = false } = {}) {
  let view = fi.view;
  if (checkResume) view = await resume(`${fi.label}:brief-resume`, fi.capability, view);
  view = await command(`${fi.label}:brief-confirm`, fi.capability, view, { type: 'brief-confirm', id: randomUUID() });
  let first = structuredClone(view.directions?.[0]);
  if (!first || first.cards.length < 5 || first.cards.length > 7) throw Error(`${fi.label}: Direction 1 contract`);
  const firstSha = sha(first.cards.map(c => c.fabricMasterId));
  if (checkResume) view = await resume(`${fi.label}:direction1-resume`, fi.capability, view);
  view = await command(`${fi.label}:direction2-prepare`, fi.capability, view, { type: 'direction-prepare', index: 1 });
  view = await command(`${fi.label}:direction2-hydrate`, fi.capability, view, { type: 'direction-hydrate', index: 1 });
  const second = structuredClone(view.directions?.[0]);
  if (!second || second.cards.length < 5 || second.cards.length > 7) throw Error(`${fi.label}: Direction 2 contract`);
  const secondSha = sha(second.cards.map(c => c.fabricMasterId));
  if (checkResume) {
    view = await resume(`${fi.label}:direction2-resume`, fi.capability, view);
    const refreshedFirst = view.directions?.find(direction => direction.id === first.id);
    if (refreshedFirst) {
      if (sha(refreshedFirst.cards.map(c => c.fabricMasterId)) !== firstSha)
        throw Error(`${fi.label}: Direction 1 reordered while preparing Direction 2`);
      first = structuredClone(refreshedFirst);
    }
    view = await command(`${fi.label}:direction2-rehydrate`, fi.capability, view, { type: 'direction-hydrate', index: 1 });
    if (sha(view.directions[0].cards.map(c => c.fabricMasterId)) !== secondSha) throw Error(`${fi.label}: Direction 2 reorder on resume`);
  }
  // Commerce intent must reference a card still present in the saved direction.
  // After final refinement, the gateway may intentionally retain only the
  // selected card, so exercise both original directions before feedback/finish.
  if (commerce) {
    for (const direction of [first, second]) {
      const card = direction.cards[0];
      if (!card.commerceToken || !card.fabricMasterId || !card.supplierSku) throw Error(`${fi.label}: commerce context absent`);
      for (const event of ['SAMPLE_INTENT', 'FABRIC_SELECTED']) {
        view = await command(`${fi.label}:commerce:${direction.id}:${event}`, fi.capability, view,
          { type: 'outcome', event, fabricMasterId: card.fabricMasterId, strategyId: direction.id });
      }
    }
  }
  if (feedback) {
    const direction = feedbackDirection === 1 ? first : second;
    const card = direction.cards.find(c => feedback === 'MORE_LIKE_THIS' ? c.feedback?.keep?.length : feedback === 'NOT_QUITE' ? c.feedback?.change?.length : true);
    if (!card) throw Error(`${fi.label}: no ${feedback} feedback option`);
    const optionIds = feedback === 'MORE_LIKE_THIS' ? [card.feedback.keep[0].id] : feedback === 'NOT_QUITE' ? [card.feedback.change[0].id] : [];
    view = await command(`${fi.label}:feedback:${feedback}:D${feedbackDirection}`, fi.capability, view, { type: 'feedback', command: {
      id: randomUUID(), strategyId: direction.id, fabricId: card.reactionId, fabricReaction: feedback,
      directionReaction: feedback === 'NOT_FOR_ME' ? 'DISLIKE' : feedback === 'NOT_QUITE' ? 'LIKE' : 'LOVE', optionIds } });
    if (checkResume) view = await resume(`${fi.label}:feedback-resume`, fi.capability, view);
    view = await command(`${fi.label}:finish`, fi.capability, view, { type: 'finish' });
    if (view.phase !== 'final') throw Error(`${fi.label}: refinement did not finish`);
    if (checkResume) view = await resume(`${fi.label}:final-resume`, fi.capability, view);
  }
  fi.view = view;
  fi.directions = { firstSha, secondSha, firstCount: first.cards.length, secondCount: second.cards.length, feedback, feedbackDirection };
  return fi;
}

async function runNaila() {
  const capability = await newSession();
  let view = await command('naila:fresh:start', capability, null, undefined, true);
  if (!view.naila) throw Error('Naila consultation state absent');
  view = await answerQuestions('naila:fresh', capability, view, questionsNaila, true);
  view = await resume('naila:fresh:resume', capability, view, true);
  cases.push({ id: 'naila-fresh', result: 'PASS', phase: view.phase, revision: view.revision });
  const ownerPath = process.env.CUK_RELEASE_MATRIX_OWNER_SESSION;
  if (ownerPath) {
    const owner = JSON.parse(await readFile(ownerPath, 'utf8'));
    const resumed = await command('naila:existing-owner:resume', owner.capability, owner.view, undefined, true);
    if (resumed.phase !== 'directions' || resumed.directions?.length < 2) throw Error('Naila owner session lost directions');
    cases.push({ id: 'naila-owner-resume', result: 'PASS', phase: resumed.phase, revision: resumed.revision });
    const browse = await call('naila:prepared-browse', '/apps/curtainsuk-decision/catalog?view=retail&browseGuide=1&naila=1',
      { headers: { 'x-curtainsuk-naila-capability': owner.capability, 'x-curtainsuk-naila-session': owner.view.sessionId } });
    if (browse.preparedBrowse?.source !== 'prepared_hci') throw Error('Naila Browse not prepared HCI');
  } else {
    cases.push({ id: 'naila-owner-resume', result: 'SKIP', reason: 'CUK_RELEASE_MATRIX_OWNER_SESSION not supplied' });
  }
}

async function run() {
  await mkdir(results, { recursive: true });
  const matrix = pairwiseCases();
  if (matrix.length !== 28 || new Set(matrix.map(s => s.join('|'))).size !== 28) throw Error('Unexpected pairwise matrix');
  await writeFile(new URL('calibration-matrix.json', results), JSON.stringify({
    generatedAt: new Date().toISOString(), reactionVocabulary: reactions, pairwiseCases: matrix,
    positionReactionPairsCovered: 240, allOrderedSequencesForLocalCheck: 4096 }, null, 2));
  if (process.argv[2]) {
    const previous = JSON.parse(await readFile(process.argv[2], 'utf8'));
    rows.push(...previous.rows);
    cases.push(...previous.cases);
    sessionIndex.push(...previous.sessionIndex);
  } else {
    await runNaila();
    await call('ordinary-browse', '/apps/curtainsuk-decision/catalog?view=retail&browseGuide=1');
    await call('browse-page', '/pages/fabric-library?view=browse-fabrics');
    await call('samples-page', '/pages/samples');
  }
  const startAt = cases.filter(item => /^calibration-\d+$/.test(item.id)).length;
  // The deep cases vary price, image/palette, feedback action and direction.
  for (let i = startAt; i < matrix.length; i++) {
    const label = `calibration-${String(i + 1).padStart(2, '0')}`;
    const image = i < 2;
    const price = prices[i % prices.length];
    const fi = await startFI(label, { image, price, answerResume: i === 0 });
    sessionIndex.push({ label, sessionId: fi.sessionId, price, image });
    await calibrate(fi, matrix[i], { resumeHalfway: i === 0 });
    if (i < 8) await directions(fi, { feedback: ['LOVE', 'MORE_LIKE_THIS', 'NOT_QUITE', 'NOT_FOR_ME'][i % 4],
      feedbackDirection: i < 4 ? 1 : 2, commerce: i === 0 || i === 4 });
    cases.push({ id: label, result: 'PASS', price, image, sequence: matrix[i],
      calibration: fi.calibration, directions: fi.directions ?? null,
      palette: fi.palette ? { confirmedSha256: fi.palette.confirmedSha256, corrected: fi.palette.corrected } : null,
      finalPhase: fi.view.phase, finalRevision: fi.view.revision });
    await flush();
    console.log(JSON.stringify({ completed: i + 1, total: matrix.length, label, phase: fi.view.phase,
      revision: fi.view.revision, slowestMs: Math.max(...rows.map(r => r.roundTripMs ?? 0)) }));
    await sleep(250);
  }
  await flush('PASS');
}

try { await run(); } catch (error) {
  await flush('FAIL', error);
  console.error(JSON.stringify({ status: 'FAIL', at: rows.at(-1)?.label, error: String(error) }));
  process.exitCode = 1;
}
