/** Only a progressive, unfinished style edit has privately stored later cards. */
export function needsPreparedDirectionCards(view: {
  phase: string;
  directions: { cards: unknown[] }[];
}): boolean {
  return view.phase !== 'final'
    && view.directions.length === 2
    && view.directions[0]!.cards.length >= 5
    && view.directions[0]!.cards.length <= 7
    && view.directions[1]!.cards.length === 0;
}
