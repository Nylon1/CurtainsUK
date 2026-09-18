import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { fingerprintJson as canonicalJson } from './serialization';
import { isObject } from '../../data/catalogue/validation';
import {
  evidenceVersion,
  exclusiveDimensions,
  extractionRules,
  fingerprintVersion,
  rulesVersion,
  vocabulary,
  vocabularyVersion,
  type FingerprintDimension,
} from './vocabulary';

export type Scope = 'DESIGN' | 'COLOURWAY' | 'COLLECTION';
export interface DescriptionGrant {
  supplierId: string;
  brandId: string;
  designId: string;
  fabricId?: string;
  scope: Scope;
  sourceType:
    | 'OFFICIAL_PRODUCT_PAGE'
    | 'OFFICIAL_TRADE_PORTAL'
    | 'OFFICIAL_DESIGN_BOOK'
    | 'OFFICIAL_COLLECTION_PAGE';
  sourceReference: string;
}
export interface DescriptionInput extends DescriptionGrant {
  text: string;
  observedAt: string;
}
export interface DescriptionEvidence extends DescriptionInput {
  evidenceId: string;
  sourceContentHash: string;
  contractVersion: string;
}
export type EvidenceReference = Omit<DescriptionEvidence, 'text' | 'observedAt'>;
export interface FingerprintSupport {
  evidenceId: string;
  ruleId: string;
  excerpt: string;
  confidence: 'HIGH' | 'MEDIUM';
}
export interface FingerprintSignal {
  dimension: FingerprintDimension;
  value: string;
  authority: 'classified';
  support: FingerprintSupport[];
}
export interface FabricFingerprint {
  version: string;
  ruleVersion: string;
  ontologyVersion: string;
  supplierId: string;
  brandId: string;
  designId: string;
  fabricId?: string;
  evidence: EvidenceReference[];
  signals: FingerprintSignal[];
  conflicts: FingerprintDimension[];
  review: { reason: string; evidenceId: string }[];
  unknownDimensions: FingerprintDimension[];
  digest: string;
}
export const fingerprintHash = (value: unknown) =>
  'sha256:' + bytesToHex(sha256(new TextEncoder().encode(canonicalJson(value))));
export const descriptionHash = (text: string) =>
  'sha256:' + bytesToHex(sha256(new TextEncoder().encode(text)));
const sortedUnique = <T>(values: T[]) =>
  [...new Map(values.map((v) => [canonicalJson(v), v])).entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, v]) => v);
const sourceTypes = [
  'OFFICIAL_PRODUCT_PAGE',
  'OFFICIAL_TRADE_PORTAL',
  'OFFICIAL_DESIGN_BOOK',
  'OFFICIAL_COLLECTION_PAGE',
];
const hosts = [
  'www.prestigious.co.uk',
  'prestigious.co.uk',
  'www.prestigiousonline.co.uk',
  'trade.sandersondesigngroup.com',
  'sanderson.sandersondesigngroup.com',
  'harlequin.sandersondesigngroup.com',
  'morrisandco.sandersondesigngroup.com',
  'clarke-clarke.sandersondesigngroup.com',
  'scion.sandersondesigngroup.com',
  'zoffany.sandersondesigngroup.com',
];

/** Trusted operator supplies exact source grants; incoming prose cannot grant its own authority. */
export function acceptDescription(
  input: unknown,
  grants: readonly DescriptionGrant[],
): DescriptionEvidence {
  if (
    !isObject(input) ||
    Object.keys(input).some(
      (k) =>
        ![
          'supplierId',
          'brandId',
          'designId',
          'fabricId',
          'scope',
          'sourceType',
          'sourceReference',
          'text',
          'observedAt',
        ].includes(k),
    )
  )
    throw new Error('Invalid description input fields');
  for (const key of ['supplierId', 'brandId', 'designId', 'sourceReference', 'text', 'observedAt'])
    if (
      typeof input[key] !== 'string' ||
      !(input[key] as string).trim() ||
      (input[key] as string).length > (key === 'text' ? 30000 : 2000)
    )
      throw new Error('Invalid description ' + key);
  if (
    !['DESIGN', 'COLOURWAY', 'COLLECTION'].includes(String(input.scope)) ||
    typeof input.scope !== 'string' ||
    typeof input.sourceType !== 'string' ||
    !sourceTypes.includes(input.sourceType)
  )
    throw new Error('Invalid source scope/type');
  if (
    input.fabricId !== undefined &&
    (typeof input.fabricId !== 'string' || !input.fabricId.trim())
  )
    throw new Error('Invalid colourway identity');
  if ((input.scope === 'COLOURWAY') !== (input.fabricId !== undefined))
    throw new Error('Scope must bind exact colourway identity');
  if (
    !/^\d{4}-\d\d-\d\dT/.test(input.observedAt as string) ||
    !Number.isFinite(Date.parse(input.observedAt as string))
  )
    throw new Error('Invalid observation date');
  const url = new URL(input.sourceReference as string);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    !hosts.includes(url.hostname) ||
    url.search
  )
    throw new Error('Not an approved official source URL');
  const { text, observedAt, ...grant } = input;
  void observedAt;
  if (!grants.some((g) => canonicalJson(g) === canonicalJson(grant)))
    throw new Error('No governed exact source grant');
  const sourceContentHash = descriptionHash(text as string);
  return structuredClone({
    ...input,
    sourceContentHash,
    contractVersion: evidenceVersion,
    evidenceId: fingerprintHash({ grant, sourceContentHash }),
  }) as DescriptionEvidence;
}

/** Parsing once per exact design; observation timestamps are audit metadata, not semantic identity. */
export function buildFingerprint(inputs: readonly DescriptionEvidence[]): FabricFingerprint {
  if (!inputs.length) throw new Error('Fingerprint needs evidence');
  const unique = sortedUnique(
    inputs.map(({ observedAt: _observedAt, ...e }) => {
      void _observedAt;
      return e;
    }),
  );
  const first = unique[0]!;
  const identity = {
    supplierId: first.supplierId,
    brandId: first.brandId,
    designId: first.designId,
    ...(first.fabricId ? { fabricId: first.fabricId } : {}),
  };
  const signals: FingerprintSignal[] = [];
  const review: FabricFingerprint['review'] = [];
  const evidence: EvidenceReference[] = [];
  for (const e of unique) {
    if (e.contractVersion !== evidenceVersion || descriptionHash(e.text) !== e.sourceContentHash)
      throw new Error('Altered or unsupported description evidence');
    const { text, ...ref } = e;
    const { contractVersion: _version, evidenceId, sourceContentHash, ...grant } = ref;
    void _version;
    if (fingerprintHash({ grant, sourceContentHash }) !== evidenceId)
      throw new Error('Evidence identity mismatch');
    if (
      e.supplierId !== first.supplierId ||
      e.brandId !== first.brandId ||
      e.designId !== first.designId ||
      e.fabricId !== first.fabricId
    )
      throw new Error('Mixed design/colourway identity');
    evidence.push(ref);
    if (e.scope === 'COLLECTION') {
      review.push({ reason: 'COLLECTION_ONLY: no design inheritance', evidenceId });
      continue;
    }
    for (const clause of text
      .normalize('NFKC')
      .replace(/<[^>]*>/g, ' ')
      .split(/[.!?;\n]+/)) {
      const clean = clause.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!clean) continue;
      if (/[\u00c3\u00e3\ufffd]|\u00ef\u00bf\u00bd/.test(clean)) {
        review.push({ reason: 'SOURCE_ENCODING: clause withheld', evidenceId });
        continue;
      }
      if (
        /\b(no|not|without|unlike|inspired|inspiration|originally|archive|wallpaper|collection|colourways?|palette|shades|colou?rs?|tones?|hues?|blue|green|grey|gray|pink|red|ivory|beige|neutral|pairs?|pairing|team|coordinates?|co-ordinates?)\b/.test(
          clean,
        )
      ) {
        review.push({ reason: 'CONTEXT_OR_NEGATION: clause withheld', evidenceId });
        continue;
      }
      if (/\b(dimensional|silky|metallic|painterly|marl|melange|mélange|distressed)\b/.test(clean))
        review.push({
          reason: 'AMBIGUOUS_OR_UNMAPPED_TERM: clause needs design review',
          evidenceId,
        });
      for (const rule of extractionRules) {
        for (const match of clean.matchAll(new RegExp(rule.phrase))) {
          if (
            ['character', 'formality'].includes(rule.dimension) &&
            /\b(rooms?|spaces?|schemes?|settings?|create|go|layer)\b/.test(clean)
          ) {
            review.push({
              reason: 'ROOM_ADVICE: not an intrinsic fabric characteristic',
              evidenceId,
            });
            continue;
          }
          if (
            /\b(effect|appearance|look|style)\b/.test(clean) &&
            ['construction', 'surface'].includes(rule.dimension) &&
            !['faux-silk', 'linen-look', 'satin-like', 'slubbed'].includes(rule.value)
          ) {
            review.push({
              reason: 'SIMULATED_APPEARANCE: construction/surface withheld',
              evidenceId,
            });
            continue;
          }
          if (!vocabulary[rule.dimension].includes(rule.value as never))
            throw new Error('Rule outside controlled vocabulary');
          signals.push({
            dimension: rule.dimension,
            value: rule.value,
            authority: 'classified',
            support: [
              { evidenceId, ruleId: rule.id, excerpt: match[0], confidence: rule.confidence },
            ],
          });
        }
      }
    }
  }
  const grouped = new Map<string, FingerprintSignal>();
  for (const signal of signals) {
    const key = signal.dimension + ':' + signal.value;
    const prior = grouped.get(key);
    if (prior) prior.support.push(...signal.support);
    else grouped.set(key, signal);
  }
  const merged = sortedUnique(
    [...grouped.values()].map((s) => ({ ...s, support: sortedUnique(s.support) })),
  );
  const conflicts: FingerprintDimension[] = exclusiveDimensions.filter(
    (d) => merged.filter((s) => s.dimension === d).length > 1,
  );
  const construction = merged.filter((s) => s.dimension === 'construction');
  const printed = construction.find((s) => s.value === 'printed'),
    woven = construction.find((s) => s.value === 'woven');
  if (
    printed &&
    woven &&
    !printed.support.some((p) => woven.support.some((w) => p.evidenceId === w.evidenceId))
  )
    conflicts.push('construction');
  const patterns = merged.filter((s) => s.dimension === 'pattern');
  if (patterns.some((s) => s.value === 'plain') && patterns.length > 1) conflicts.push('pattern');
  for (const d of conflicts)
    review.push({
      reason: `CONFLICT:${d}`,
      evidenceId: merged.find((s) => s.dimension === d)!.support[0]!.evidenceId,
    });
  if (!merged.length && first.scope !== 'COLLECTION')
    review.push({ reason: 'NO_SAFE_SIGNAL', evidenceId: first.evidenceId });
  const result = {
    version: fingerprintVersion,
    ruleVersion: rulesVersion,
    ontologyVersion: vocabularyVersion,
    ...identity,
    evidence: sortedUnique(evidence),
    signals: merged,
    conflicts: sortedUnique(conflicts),
    review: sortedUnique(review),
    unknownDimensions: (Object.keys(vocabulary) as FingerprintDimension[]).filter(
      (d) => !merged.some((s) => s.dimension === d),
    ),
  };
  return { ...result, digest: fingerprintHash(result) };
}

export function validateFingerprint(f: FabricFingerprint): void {
  const { digest, ...body } = f;
  if (
    f.version !== fingerprintVersion ||
    f.ruleVersion !== rulesVersion ||
    f.ontologyVersion !== vocabularyVersion ||
    fingerprintHash(body) !== digest
  )
    throw new Error('Fingerprint content/version mismatch');
  for (const s of f.signals)
    if (
      !Object.hasOwn(vocabulary, s.dimension) ||
      !vocabulary[s.dimension].includes(s.value as never) ||
      s.authority !== 'classified' ||
      !s.support.length ||
      s.support.some((p) => !f.evidence.some((e) => e.evidenceId === p.evidenceId))
    )
      throw new Error('Invalid fingerprint signal');
}
export function projectFingerprint(
  design: FabricFingerprint,
  target: { supplierId: string; brandId: string; designId: string; fabricId: string },
): FabricFingerprint {
  validateFingerprint(design);
  if (
    target.designId !== design.designId ||
    target.brandId !== design.brandId ||
    target.supplierId !== design.supplierId ||
    (design.fabricId && design.fabricId !== target.fabricId)
  )
    throw new Error('Fingerprint inheritance identity mismatch');
  const { digest: _digest, ...copy } = structuredClone(design);
  void _digest;
  const projected = { ...copy, fabricId: target.fabricId };
  return { ...projected, digest: fingerprintHash(projected) };
}
/** Build once per exact design. Callers retain this immutable-by-ownership projection per release. */
export function buildDesignFingerprints(
  evidence: readonly DescriptionEvidence[],
): FabricFingerprint[] {
  const groups = new Map<string, DescriptionEvidence[]>();
  for (const e of evidence) {
    if (e.scope !== 'DESIGN') continue;
    const key = canonicalJson([e.supplierId, e.brandId, e.designId]);
    const group = groups.get(key) ?? [];
    group.push(e);
    groups.set(key, group);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, values]) => buildFingerprint(values));
}
export function explainFingerprint(f: FabricFingerprint): string[] {
  validateFingerprint(f);
  return f.signals.map(
    (s) =>
      `${s.dimension}: ${s.value} — classified from ${sortedUnique(s.support.map((p) => p.excerpt)).join(', ')} (${s.support.map((p) => p.evidenceId).join(', ')}).`,
  );
}
