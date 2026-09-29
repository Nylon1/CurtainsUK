import { gunzipSync } from 'node:zlib';

export function verifyPersistedCalibration(testCase, savedVersions) {
  const expected = testCase.calibration;
  if (!expected || testCase.sequence?.length !== 6 || expected.fabricHistory?.length !== 6 ||
      expected.revisionHistory?.length !== 6 || savedVersions.length !== 6) {
    throw Error(`${testCase.id}: incomplete six-event audit input`);
  }
  const sorted = [...savedVersions].sort((a, b) => a.revision - b.revision);
  for (let index = 0; index < 6; index++) {
    const row = sorted[index];
    if (row.revision !== expected.startingRevision + index + 1 ||
        row.revision !== expected.revisionHistory[index]) {
      throw Error(`${testCase.id}: saved revision mismatch at event ${index + 1}`);
    }
    const envelope = row.private_state;
    const state = typeof envelope?.hciStateCompressed === 'string'
      ? JSON.parse(gunzipSync(Buffer.from(envelope.hciStateCompressed, 'base64')).toString('utf8'))
      : envelope;
    const events = state?.eyeReactions;
    if (!Array.isArray(events) || events.length !== index + 1) {
      throw Error(`${testCase.id}: saved event prefix length mismatch at revision ${row.revision}`);
    }
    for (let event = 0; event <= index; event++) {
      if (events[event]?.reaction !== testCase.sequence[event] ||
          events[event]?.fabricMasterId !== expected.fabricHistory[event]) {
        throw Error(`${testCase.id}: saved ordered reaction/fabric mismatch at revision ${row.revision}`);
      }
    }
  }
  return { caseId: testCase.id, revisions: sorted.map(row => row.revision),
    persistedEventPrefixLengths: [1, 2, 3, 4, 5, 6] };
}
