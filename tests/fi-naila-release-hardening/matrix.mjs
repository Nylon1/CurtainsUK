export const reactions = Object.freeze(['LOVE', 'LIKE', 'NOT_SURE', 'DISLIKE']);
export const prices = Object.freeze(['MID_RANGE', 'LUXURY', 'PREMIUM_LUXURY', 'SUPER_LUXURY']);
export const questionsFI = Object.freeze(['curtain-priority', 'atmosphere', 'pattern']);
export const questionsNaila = Object.freeze(['curtain-priority', 'atmosphere', 'colour-family', 'pattern']);

export function allOrderedReactionHistories() {
  return Array.from({ length: 4096 }, (_, encoded) => {
    let value = encoded;
    return Array.from({ length: 6 }, () => {
      const reaction = reactions[value % 4];
      value = Math.floor(value / 4);
      return reaction;
    });
  });
}

export function pairwiseCases() {
  const universe = new Set();
  for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++)
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) universe.add(`${i}:${j}:${a}:${b}`);
  const candidates = allOrderedReactionHistories().map(sequence => {
    const coverage = [];
    for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++)
      coverage.push(`${i}:${j}:${reactions.indexOf(sequence[i])}:${reactions.indexOf(sequence[j])}`);
    return { sequence, coverage };
  });
  const chosen = [];
  while (universe.size) {
    let winner, score = -1;
    for (const candidate of candidates) {
      const count = candidate.coverage.filter(key => universe.has(key)).length;
      if (count > score) { winner = candidate; score = count; }
    }
    if (!winner || !score) throw Error('Pairwise generator stalled');
    chosen.push(winner.sequence);
    for (const key of winner.coverage) universe.delete(key);
  }
  return chosen;
}
