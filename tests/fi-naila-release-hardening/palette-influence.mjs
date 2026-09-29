import { randomUUID, createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { base, origin, results } from './target.mjs';

const rows = [];
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function fetchJson(label, path, body) {
  const started = performance.now();
  const response = await fetch(base + path, { method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(40_000),
    headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const view = await response.json();
  rows.push({ label, status: response.status, roundTripMs: Math.round(performance.now() - started),
    revision: view.revision ?? null, phase: view.phase ?? null, error: view.error ?? null });
  if (!response.ok) throw Error(`${label}: HTTP ${response.status}`);
  return view;
}
async function save(verdict, extra = {}) {
  await writeFile(new URL('palette-influence-results.json', results), JSON.stringify({
    checkedAt: new Date().toISOString(), verdict, rows, ...extra }, null, 2));
}

let sessionId = null;
try {
  const session = await fetchJson('session', '/apps/curtainsuk-decision/premium-session', {});
  let view;
  const command = async (label, action) => {
    view = await fetchJson(label, '/apps/curtainsuk-decision/premium-command', { capability: session.capability,
      command: { requestId: randomUUID(), sessionId: view?.sessionId ?? null, revision: view?.revision ?? null,
        ...(action ? { action } : {}) } });
    sessionId = view.sessionId;
    return view;
  };
  const edit = (type, fields = {}) => command(`palette:${type}`, { type: 'palette', edit: {
    id: randomUUID(), revision: view.palette.state.revision, type, ...fields } });
  await command('start');
  const image = await readFile(new URL('../../public/reference-experience/living-room.jpg', import.meta.url));
  await command('room-image', { type: 'image', mime: 'image/jpeg', referenceType: 'room', bytes: image.toString('base64') });
  await edit('begin-review');
  const palette = structuredClone(view.palette.state.palette);
  const colours = ['primary', 'secondary', 'accent'].flatMap(role => (palette[role] ?? []).map(colour => ({ role, colour })));
  if (colours.length < 3) throw Error('Room fixture did not yield three reviewable colours');
  const desired = ['important', 'consider', 'ignore'];
  for (const [index, { role, colour }] of colours.entries()) {
    await edit('review-colour', { previousColour: colour, colour, category: role,
      feature: role === 'primary' ? 'walls' : 'accessories', influence: desired[index % desired.length] });
  }
  await edit('complete-review');
  const paletteSha256 = sha(view.palette.state.confirmedPalette);
  const roomSha256 = sha(view.palette.state.room.confirmed);
  await command('resume-confirmed');
  if (sha(view.palette.state.confirmedPalette) !== paletteSha256 || sha(view.palette.state.room.confirmed) !== roomSha256)
    throw Error('Confirmed palette/influence state lost on resume');
  for (const questionId of ['curtain-priority', 'atmosphere', 'pattern']) {
    if (view.question?.id !== questionId) throw Error(`Wrong FI question ${view.question?.id}`);
    await command(`answer:${questionId}`, { type: 'answer', questionId, answerId: view.question.answers[0].id });
  }
  if (view.phase !== 'price') throw Error('FI did not reach price');
  await command('price:MID_RANGE', { type: 'price-level', level: 'MID_RANGE' });
  if (view.phase !== 'calibration') throw Error('FI did not reach calibration');
  if (sha(view.palette.state.confirmedPalette) !== paletteSha256 || sha(view.palette.state.room.confirmed) !== roomSha256)
    throw Error('Room Palette changed after price selection');
  await save('PASS', { sessionId, reviewedColours: colours.length, requestedInfluences: desired,
    confirmedPaletteSha256: paletteSha256, confirmedRoomSha256: roomSha256,
    finalPhase: view.phase, finalRevision: view.revision });
  console.log(JSON.stringify({ verdict: 'PASS', sessionId, reviewedColours: colours.length, revision: view.revision }));
} catch (error) {
  await save('FAIL', { sessionId, error: String(error) });
  console.error(JSON.stringify({ verdict: 'FAIL', error: String(error) }));
  process.exitCode = 1;
}
