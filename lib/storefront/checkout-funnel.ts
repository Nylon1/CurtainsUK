// Aggregate only fixed, consented step names. A journey/product combination is
// counted once per step even when a shopper refreshes or retries.
export const MY_HOME_STEPS = [
  'MY_HOME_CART_VIEW', 'MY_HOME_REVIEW_READY', 'MY_HOME_REVIEW_BLOCKED',
  'MY_HOME_REVIEW_FAILED', 'MY_HOME_ORDER_NOW', 'MY_HOME_HANDOFF_READY',
  'MY_HOME_HANDOFF_FAILED', 'MY_HOME_RETURNED',
] as const;

export type MyHomeStep = typeof MY_HOME_STEPS[number];
export type FunnelEvent = { journey_id: string; name: string; code: string | null; occurred_at: string; release: string };
export type FunnelRow = { mix: string; journeys: number; steps: Record<MyHomeStep, number>;
  lastObservedAfter24h: Partial<Record<MyHomeStep, number>> };

const names = new Set<string>(MY_HOME_STEPS);
const mixPattern = /^(?:CURTAIN|ROMAN|CUSHION|TRACK)(?:_(?:CURTAIN|ROMAN|CUSHION|TRACK)){0,3}$/;

export function summarizeMyHomeFunnel(events: FunnelEvent[], now = Date.now()): FunnelRow[] {
  const journeys = new Map<string, { mix: string; names: Set<MyHomeStep>; latest: MyHomeStep; at: number }>();
  for (const event of events) {
    if (!names.has(event.name) || !event.code || !mixPattern.test(event.code)
      || event.release.endsWith('-qa')) continue;
    const at = Date.parse(event.occurred_at);
    if (!Number.isFinite(at) || at > now) continue;
    const key = `${event.journey_id}:${event.code}`;
    const step = event.name as MyHomeStep;
    const current = journeys.get(key);
    if (current) {
      current.names.add(step);
      if (at > current.at) { current.latest = step; current.at = at; }
    } else journeys.set(key, { mix: event.code, names: new Set([step]), latest: step, at });
  }
  const rows = new Map<string, FunnelRow>();
  for (const journey of journeys.values()) {
    let row = rows.get(journey.mix);
    if (!row) {
      row = { mix: journey.mix, journeys: 0, steps: Object.fromEntries(MY_HOME_STEPS.map(name => [name, 0])) as Record<MyHomeStep, number>, lastObservedAfter24h: {} };
      rows.set(journey.mix, row);
    }
    row.journeys++;
    for (const step of journey.names) row.steps[step]++;
    if (now - journey.at >= 86_400_000) row.lastObservedAfter24h[journey.latest] = (row.lastObservedAfter24h[journey.latest] ?? 0) + 1;
  }
  return [...rows.values()].sort((a, b) => b.journeys - a.journeys || a.mix.localeCompare(b.mix));
}
