import type { ConsultationPhase, ConsultationState, NailaView } from './types';

/** Backend operations are capabilities, not customer-facing stages. */
export function initialPresentationPhase(view: NailaView): ConsultationPhase {
  if (view.directions?.length) return 'recommend';
  if (view.phase === 'discovery') return view.revision === 0 ? 'welcome' : 'understand';
  if (view.phase === 'price') return 'understand';
  if (view.phase === 'calibration') return 'react';
  if (view.phase === 'brief') return view.calibrationProgress && view.calibrationProgress.current===view.calibrationProgress.total ? 'refine' : 'explore';
  return 'refine';
}

function allowedPhase(view: NailaView, phase: unknown): phase is ConsultationPhase {
  if (phase === 'act') return true; // Fabric explanation is available throughout Browse.
  if (view.directions.length) return phase === 'recommend';
  if (view.phase === 'brief') return phase === 'explore' || phase === 'refine';
  if (view.phase === 'discovery' && view.revision === 0) return phase === 'welcome' || phase === 'understand';
  return phase === initialPresentationPhase(view);
}

/** Reconcile one downstream state after an acknowledged commit or resume.
 * Cached preferences are NEVER read. Only a compatible presentation cursor is
 * retained; every fact is replaced by the fresh committed server projection. */
export function reconcileConsultation(view: NailaView, committed: ConsultationState, previous: unknown, action?: string): ConsultationState {
  const prior = previous && typeof previous === 'object' ? previous as Partial<ConsultationState> : null;
  const sameSession = prior?.version === 2 && prior.sessionId === view.sessionId;
  const sameRevision = sameSession && prior.revision === view.revision;
  const nextCommit = sameSession && !!action && prior.revision === view.revision - 1;
  const compatible = sameRevision || nextCommit;
  const phase = action === 'brief-adjust' ? 'refine'
    : compatible && allowedPhase(view, prior?.currentPhase) ? prior.currentPhase : initialPresentationPhase(view);
  const selected = phase === 'act' && typeof prior?.selectedFabricId === 'string' && /^[a-zA-Z0-9:_-]{1,160}$/.test(prior.selectedFabricId) ? prior.selectedFabricId : null;
  return {
    ...committed,
    currentPhase: phase === 'act' && !selected ? initialPresentationPhase(view) : phase,
    selectedFabricId: selected,
    returnPhase: compatible && prior?.returnPhase && prior.returnPhase !== ('act' as string) && allowedPhase(view, prior.returnPhase) ? prior.returnPhase : null,
    workspace: compatible && (prior?.workspace === 'exploration' || prior?.workspace === 'recommendations') ? prior.workspace : 'browse',
    directionIndex: compatible && (prior?.directionIndex === 0 || prior?.directionIndex === 1) ? prior.directionIndex : null,
  };
}

/** Membership/order, not command revision, determines a meaningful grid change.
 * Shortlist updates and token renewals must not redraw an unchanged catalogue. */
export function recommendationSignature(view: NailaView, index: number | null = null): string {
  const directions = index === null ? view.directions : view.directions.slice(index, index + 1);
  return JSON.stringify(directions.filter(d => d.cards.length).map(d => [d.id, d.label, d.cards.map(c => [c.fabricMasterId, c.supplierSku])]));
}
