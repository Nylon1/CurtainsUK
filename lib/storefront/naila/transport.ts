import { acknowledgedPremiumRevision } from '../../../components/curtainsuk-premium-transport';
import type { NailaView } from './types';
export type NailaCommand = { requestId: string; sessionId: string | null; revision: number | null; action?: Record<string, unknown> };
export function acknowledgeNaila(command: NailaCommand, result: NailaView): NailaView {
  if (result.sessionId !== (command.sessionId ?? command.requestId)) throw Error('HCI_SESSION_MISMATCH');
  const read = !command.action && !!command.sessionId || command.action?.type === 'direction-hydrate';
  acknowledgedPremiumRevision(command.revision, result.revision, !read);
  if (result.naila && (result.naila.sessionId !== result.sessionId || result.naila.revision !== result.revision))
    throw Error('NAILA_MEMORY_REVISION_MISMATCH');
  return result;
}

/** Presentation envelope is deliberately outside the exact HCI command. */
export function nailaEnvelope(capability: string, command: NailaCommand) {
  return { capability, command, presentation: 'naila-v1' };
}

/** Only currently offered governed choices can produce an answer. */
export function nailaAnswer(view: NailaView, answerId: string) {
  if (view.phase !== 'discovery' || !view.question?.answers.some(answer => answer.id === answerId))
    throw Error('NAILA_ANSWER_NOT_OFFERED');
  return { type: 'answer', answerId };
}
