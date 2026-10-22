import { AUTOMATED_MTM_WINDOW_SLUGS } from './mtm-production-policy';
import { automatedMtmWindow } from './mtm-configuration-contract';

const windows: readonly string[] = [...AUTOMATED_MTM_WINDOW_SLUGS, 'UNKNOWN'];
const masters = ['standard-window', 'sliding-doors', 'patio-doors', 'french-doors', 'bifold-doors', 'bay-window', 'UNKNOWN'];
const hardware = ['TRACK', 'POLE', 'UNSELECTED', 'UNRECOGNISED'];
const headings = ['PENCIL_PLEAT', 'DOUBLE_PINCH', 'WAVE', 'EYELET', 'UNSELECTED', 'UNRECOGNISED'];
const constructions = ['PAIR', 'SINGLE', 'UNSELECTED', 'UNRECOGNISED'];
const storefronts = ['mtm-configurator-20261022-v1', 'UNKNOWN'];
const bounded = (value: unknown, allowed: readonly string[]) => value == null || value === '' ? 'UNSELECTED' : typeof value === 'string' && allowed.includes(value) ? value : 'UNRECOGNISED';
export type PriceDiagnosticContext = {
  windowSlug: string; masterWindowSlug: string; hardware: string; heading: string;
  construction: string; storefrontRelease: string; apiRelease: string;
};

/** Only fixed enums and the server's deployment identity, never raw input. */
export function priceDiagnosticContext(input: unknown, storefrontRelease: string | null, apiRelease: string | undefined): PriceDiagnosticContext {
  const value = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const windowSlug = typeof value.windowSlug === 'string' && windows.includes(value.windowSlug) ? value.windowSlug : 'UNKNOWN';
  let masterWindowSlug = 'UNKNOWN';
  if (windowSlug !== 'UNKNOWN') masterWindowSlug = automatedMtmWindow(windowSlug).windowType.slug;
  return { windowSlug, masterWindowSlug, hardware: bounded(value.hardware, hardware),
    heading: bounded(value.heading, headings), construction: bounded(value.construction, constructions),
    storefrontRelease: storefronts.includes(storefrontRelease ?? '') ? storefrontRelease! : 'UNKNOWN',
    apiRelease: /^dpl_[A-Za-z0-9]{1,64}$/.test(apiRelease ?? '') ? apiRelease! : 'UNKNOWN' };
}

export function parsePriceDiagnosticContext(value: unknown): PriceDiagnosticContext | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (Object.keys(item).sort().join(',') !== 'apiRelease,construction,hardware,heading,masterWindowSlug,storefrontRelease,windowSlug') return null;
  for (const [key, allowed] of [['windowSlug', windows], ['masterWindowSlug', masters], ['hardware', hardware], ['heading', headings], ['construction', constructions], ['storefrontRelease', storefronts]] as const) {
    if (typeof item[key] !== 'string' || !(allowed as readonly string[]).includes(item[key])) return null;
  }
  if (typeof item.apiRelease !== 'string' || !/^(?:UNKNOWN|dpl_[A-Za-z0-9]{1,64})$/.test(item.apiRelease)) return null;
  return item as PriceDiagnosticContext;
}
