export const cm = n => `${Number(n.toFixed(1))} cm`;
const blank = v => v === undefined || v === null || String(v).trim() === '';
function number(v, label, min, max, optional = false, integer = false) {
  if (optional && blank(v)) return null;
  const n = blank(v) ? NaN : Number(v);
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) throw new Error(`Enter ${label}${integer ? ' as a whole number' : ''} between ${min} and ${max}.`);
  return n;
}
export function calculatePinch(d) {
  if (!['pair','single'].includes(d.panels)) throw new Error('Choose a pair or one curtain.');
  if (!['pole','track'].includes(d.support)) throw new Error('Choose a pole or a track.');
  const width = number(d.width, 'the pole or track width', 1, 2000);
  const pair = d.panels === 'pair';
  const drop = number(d.drop, 'the curtain drop', 1, 1000, true);
  const eyeToHem = number(d.eyeToHem, 'the eye-to-hem measurement', 1, 1000, true);
  if (eyeToHem !== null && drop === null) throw new Error('Add the curtain drop to calculate the hook height.');
  const seatBelowTop = drop !== null && eyeToHem !== null ? Math.round((drop - eyeToHem)*10)/10 : null;
  const panels = (pair ? ['Left','Right'] : ['Left']).map((side, i) => {
    const name = pair ? `${side} curtain` : 'Your curtain';
    const pleats = number(d['pleats'+side], `${name.toLowerCase()} pleat count`, 1, 200, false, true);
    const ends = number(d['ends'+side] ?? 2, `${name.toLowerCase()} extra end-hook count`, 0, 4, false, true);
    const finished = number(d['finished'+side], `${name.toLowerCase()} finished heading width`, 1, 2000, true);
    let positions = null;
    if (!blank(d['positions'+side])) {
      if (finished === null) throw new Error(`Add the finished heading width for ${name.toLowerCase()} before adding pleat positions.`);
      positions = String(d['positions'+side]).split(',').map(s => number(s, 'each pleat position', 0.1, finished));
      if (positions.length !== pleats) throw new Error(`Enter ${pleats} pleat positions for ${name.toLowerCase()}, separated by commas.`);
      if (positions.some((n,j) => n >= finished || (j && n <= positions[j-1]))) throw new Error('Pleat positions must increase from the outside edge and stay inside the heading.');
    }
    return {name, pleats, ends, hooks:pleats+ends, finished, nominal:width/(pair?2:1), positions,
      gaps:positions?.slice(1).map((n,j)=>Math.round((n-positions[j])*10)/10) ?? null};
  });
  return {width,pair,support:d.support,hardware:d.support==='pole'?'rings':'gliders',drop,eyeToHem,seatBelowTop,panels,totalHooks:panels.reduce((s,p)=>s+p.hooks,0)};
}
