/** Customer journey identity is committed with HCI state, never inferred from a palette. */
export type PremiumJourney = 'fabric-intelligence' | 'naila-v1';

export function requestedPremiumJourney(nailaPresentation: boolean): PremiumJourney {
  return nailaPresentation ? 'naila-v1' : 'fabric-intelligence';
}

export function assertPremiumJourney(state: Record<string, unknown> | null, requested: PremiumJourney) {
  const saved = state?.journey;
  if (saved !== undefined && saved !== 'fabric-intelligence' && saved !== 'naila-v1')
    throw Error('HCI_STORAGE_UNAVAILABLE');
  if (saved && saved !== requested) throw Error('HCI_SESSION_CONFLICT');
}

export function assertRecoverableFiView(
  state: Record<string, unknown> | null,
  view: { phase?: unknown; question?: { id?: unknown } | null } | null,
  requested: PremiumJourney,
) {
  if (requested === 'fabric-intelligence' && view?.phase === 'discovery' &&
      view.question?.id === 'colour-family' && !Array.isArray(state?.tasteAnswers))
    throw Error('HCI_STORAGE_UNAVAILABLE');
}

export function needsDiscoveryReprojection(
  state: Record<string, unknown> | null,
  view: { phase?: unknown; question?: { id?: unknown } | null },
  requested: PremiumJourney,
) {
  // Historical FI sessions can hold a colour question in their saved view.
  // Re-read HCI's FI question sequence; do not mutate evidence on resume.
  return requested === 'fabric-intelligence' && view.phase === 'discovery' &&
    Array.isArray(state?.tasteAnswers) &&
    (!state.journey || view.question?.id === 'colour-family');
}

export function staleColourAnswer(
  state: Record<string, unknown> | null,
  view: { phase?: unknown; question?: { id?: unknown; answers?: { id?: unknown }[] } | null },
  requested: PremiumJourney,
  action: Record<string, unknown> | undefined,
) {
  if (!(needsDiscoveryReprojection(state, view, requested) &&
    Array.isArray(state?.tasteAnswers) && state.tasteAnswers.length === 2 &&
    view.question?.id === 'colour-family' && action?.type === 'answer')) return false;
  // New FI clients identify the question they actually rendered. Old open
  // clients have no questionId: reject an answer from their saved colour view,
  // but allow a disjoint pattern answer after a read-only resume. HCI still
  // validates that the latter is a currently offered governed answer.
  if (action.questionId !== undefined) return action.questionId !== 'pattern';
  return !Array.isArray(view.question.answers) ||
    view.question.answers.some((answer) => answer.id === action.answerId);
}
