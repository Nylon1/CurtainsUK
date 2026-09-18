import { isKnownFact } from '../../data/catalogue/compiler';
import type {
  CanonicalFabric,
  FabricMatchScore,
  TechnicalDecisionState,
} from '../../data/catalogue/types';

/** Readiness is categorical; numeric utilities compare only within a tier. */
const readinessOrder: Record<TechnicalDecisionState, number> = {
  supported: 3,
  conditional: 2,
  'insufficient-information': 1,
  incompatible: 0,
};

export function compareRecommendationCandidates<T extends FabricMatchScore>(
  a: T,
  b: T,
  utility: (candidate: T) => number,
): number {
  return (
    readinessOrder[b.technicalDecision] - readinessOrder[a.technicalDecision] ||
    utility(b) - utility(a) ||
    (a.fabricId < b.fabricId ? -1 : a.fabricId > b.fabricId ? 1 : 0)
  );
}

/** Filter first, then fill supported -> conditional -> exploratory gaps; never resurrect failures. */
export function selectSwatchCandidates<T extends FabricMatchScore & { customerExcluded?: boolean }>(
  matches: readonly T[],
  catalogue: readonly CanonicalFabric[],
  limit: number,
  utility: (candidate: T) => number,
): T[] {
  if (!Number.isInteger(limit) || limit < 1 || limit > 12) throw new Error('Invalid swatch limit');
  const byId = new Map(catalogue.map((fabric) => [fabric.id, fabric]));
  return matches
    .filter((match) => {
      const fabric = byId.get(match.fabricId);
      return Boolean(
        match.eligible &&
        match.technicalDecision !== 'incompatible' &&
        !match.customerExcluded &&
        fabric &&
        isKnownFact(fabric.active) &&
        fabric.active.value &&
        isKnownFact(fabric.sampleAvailable) &&
        fabric.sampleAvailable.value,
      );
    })
    .sort((a, b) => compareRecommendationCandidates(a, b, utility))
    .slice(0, limit);
}

/** Keep readiness and its actual conditions visible even when positive reasons are truncated by UI. */
export function shortlistReasons(match: FabricMatchScore): string[] {
  const notice =
    match.technicalDecision === 'conditional'
      ? 'Conditional option: satisfy the technical conditions or obtain verification before choosing this fabric.'
      : match.technicalDecision === 'insufficient-information'
        ? 'Exploratory option only: insufficient technical information; verification is required before suitability can be established.'
        : null;
  return [...new Set([...(notice ? [notice] : []), ...match.cautions, ...match.reasons])];
}
