import assert from 'node:assert/strict';
import { test } from 'node:test';
import { completedTenMinuteWindow, criticalGroups } from './critical-error-alert';

test('critical alert checks one completed ten-minute window', () => {
  const window = completedTenMinuteWindow(new Date('2026-11-07T12:25:03.000Z'));
  assert.deepEqual(window, { start: new Date('2026-11-07T12:10:00.000Z'),
    end: new Date('2026-11-07T12:20:00.000Z') });
});

test('critical alerts surface tool failures but do not page on one cancelled browse request', () => {
  const event = (code: string, feature: string) => ({ code, status: null,
    page_path: '/pages/room-visualiser', error_detail: { feature } });
  const groups = criticalGroups([
    event('ROOM_FRAME_RENDER_FAILED', 'ROOM_VISUALISER'),
    event('API_NETWORK_ERROR', 'FABRICS'),
    event('EMBEDDED_EXCEPTION', 'SMART_TRACK_STUDIO'),
    event('EMBEDDED_EXCEPTION', 'GENERAL'),
  ], [{ code: 'SMART_TRACK_SCENE_FAILED', route_path: '/api/staging/shopify-proxy/smart-track' },
    { code: 'HOURLY_DIGEST_DELIVERY_FAILED', route_path: '/api/cron/error-centre-digest' }]);
  assert.deepEqual(groups.map(group => group.code), [
    'EMBEDDED_EXCEPTION', 'ROOM_FRAME_RENDER_FAILED', 'SMART_TRACK_SCENE_FAILED',
  ]);
});
