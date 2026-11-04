export const CARRIER_CM = 8;
export const HOOK_CM = 16;
export const cm = n => `${Number(n.toFixed(1))} cm`;

// Evans EasiWave calculator, checked 4 November 2026:
// round up (rail span / carrier interval + 1.5) to the next even number.
// This is a planning count. Do not silently change an existing matched carrier set.
export function calculateWave(d) {
  function number(key, label, {required = false, zero = false, max = 10000} = {}) {
    if (d[key] === '' || d[key] == null) {
      if (required) throw Error(`Enter ${label}.`);
      return null;
    }
    const n = Number(d[key]);
    if (!Number.isFinite(n) || (zero ? n < 0 : n <= 0) || n > max) throw Error(`Check ${label}.`);
    return n;
  }
  if (!['single', 'pair'].includes(d.panels)) throw Error('Choose one curtain or a pair.');
  const width = number('width', 'your track width', {required: true, max: 2000});
  const pair = d.panels === 'pair';
  const leftSpan = pair ? number('leftSpan', 'the left curtain coverage') ?? width / 2 : width;
  if (pair && leftSpan >= width) throw Error('Left curtain coverage must be less than the track width.');
  const drop = number('drop', 'the curtain drop', {max: 2000});
  const panels = (pair ? ['Left', 'Right'] : ['Left']).map((side, index) => {
    const name = pair ? `${side} curtain` : 'Your curtain';
    const span = index ? width - leftSpan : leftSpan;
    const flat = number(`flat${side}`, `${pair ? side.toLowerCase() + ' curtain' : 'curtain'} flat width`, {required: true});
    const first = number(`first${side}`, `${pair ? side.toLowerCase() + ' ' : ''}first hook position`, {zero: true});
    const hooks = Math.max(2, Math.ceil((span / CARRIER_CM + 1.5 - 1e-10) / 2) * 2);
    const hookSpan = (hooks - 1) * HOOK_CM;
    const endFabric = Number((flat - hookSpan).toFixed(4));
    const fits = endFabric > 0;
    if (first !== null && fits && first >= endFabric) {
      throw Error(`${name}: the first hook must be less than ${cm(endFabric)} from the outside edge to leave fabric beyond the last hook.`);
    }
    const referenceFlat = hooks * HOOK_CM;
    const positions = fits ? Array.from({length: hooks}, (_, i) => Number(((first ?? 0) + i * HOOK_CM).toFixed(4))) : [];
    return {name, side, flat, span, hooks, carriers: hooks, hookSpan, referenceFlat,
      endFabric, fits, first: fits ? first : null, last: fits && first !== null ? positions.at(-1) : null,
      lastAllowance: fits && first !== null ? Number((endFabric - first).toFixed(4)) : null,
      positions, fullness: flat / span,
      needsCheck: !fits || Math.abs(flat - referenceFlat) > 1,
      stackEstimate: Number((hooks * 1.2).toFixed(1))};
  });
  return {width, pair, drop, panels, totalHooks: panels.reduce((sum, p) => sum + p.hooks, 0),
    totalCarriers: panels.reduce((sum, p) => sum + p.carriers, 0), carrierSpacing: CARRIER_CM,
    hookSpacing: HOOK_CM, needsCheck: panels.some(p => p.needsCheck)};
}
