import { WINDOW_TYPES_BY_SLUG } from '@/lib/decision-engine/seed/window-types';
import { MTM_PRODUCTION_PRICING_RULE_SET } from '@/lib/decision-engine/seed/production-pricing-rules';
import type { ConstructionType, CoverageMeasurementBasis, StackDirection } from '@/lib/decision-engine/types';
import { STOREFRONT_WINDOWS_BY_SLUG } from './window-catalog';
import { headingsForAutomatedMtm, isAutomatedMtmWindowSlug, type MtmHardware } from './mtm-production-policy';

export const MTM_CONFIGURATION_CONTRACT_VERSION = 'mtm-20261022-v1';

/** Pricing and the public capability projection resolve exactly the same master. */
export function automatedMtmWindow(windowSlug: string) {
  if (!isAutomatedMtmWindowSlug(windowSlug)) throw Error('MTM_AUTOMATED_OPENING_UNAVAILABLE');
  const storefrontWindow = STOREFRONT_WINDOWS_BY_SLUG.get(windowSlug);
  const windowType = WINDOW_TYPES_BY_SLUG.get(storefrontWindow?.masterSlugs[0] ?? '');
  if (!storefrontWindow || !windowType) throw Error('Window type is unavailable');
  return { storefrontWindow, windowType, windowSlug };
}

export function mtmStackDirections(construction: ConstructionType): readonly StackDirection[] {
  return construction === 'PAIR' ? ['SPLIT'] : construction === 'SINGLE' ? ['LEFT', 'RIGHT'] : [];
}

/** No costs, prices or customer data. Never infer capabilities in the browser. */
export function mtmConfigurationContract(windowSlug: string) {
  if (!isAutomatedMtmWindowSlug(windowSlug)) return null;
  const { windowType } = automatedMtmWindow(windowSlug);
  const rules = MTM_PRODUCTION_PRICING_RULE_SET.measurementValidation;
  return {
    version: MTM_CONFIGURATION_CONTRACT_VERSION,
    masterWindowSlug: windowType.slug,
    routes: (['TRACK', 'POLE'] as MtmHardware[]).flatMap(hardware => {
      const measurementBasis: CoverageMeasurementBasis = hardware === 'TRACK' ? 'TRACK_WIDTH' : 'POLE_USABLE_WIDTH';
      if (!windowType.allowedMeasurementBases.includes(measurementBasis)) return [];
      return headingsForAutomatedMtm({ windowSlug, hardware })
        .filter(heading => windowType.availableCurtainHeadings.includes(heading))
        .map(heading => ({ hardware, measurementBasis, heading,
          constructions: windowType.pairSingleAvailability.map(construction => ({
            value: construction, stackDirections: mtmStackDirections(construction),
          })),
        }));
    }),
    measurements: { minimumWidthCm: rules.minimumWidthCm, maximumWidthCm: rules.maximumWidthCm,
      minimumDropCm: rules.minimumDropCm, maximumDropCm: rules.maximumDropCm,
      suspiciousLikelyMillimetresAtCm: rules.suspiciousLikelyMillimetresAtCm },
  };
}
