import type { CanonicalFabric, FabricFact, FactAuthority } from './types';
import {
  catalogueFieldNames,
  isMachineId,
  isObject,
  isText,
  validateCatalogueValue,
  equalCatalogueValues,
  type CatalogueField,
} from './validation';

export const authorityRank: Record<FactAuthority, number> = {
  unknown: 0,
  classified: 1,
  'source-provided': 2,
  verified: 3,
};
export function isKnownFact<T>(fact: FabricFact<T> | undefined): fact is FabricFact<T> {
  return Boolean(fact && fact.authority !== 'unknown' && fact.value !== 'unknown');
}

function assertFact(name: CatalogueField, fact: unknown) {
  if (!isObject(fact)) throw new Error(`${name} requires a fact`);
  if (
    Object.keys(fact).some(
      (k) => !['value', 'authority', 'source', 'note', 'supportingAssertions'].includes(k),
    )
  )
    throw new Error(`${name} unsupported fact properties`);
  const errors = validateCatalogueValue(name, fact.value);
  if (errors.length) throw new Error(errors.join('; '));
  if (typeof fact.authority !== 'string' || !Object.hasOwn(authorityRank, fact.authority))
    throw new Error(`${name} invalid authority`);
  if (!isObject(fact.source) || !isText(fact.source.reference))
    throw new Error(`${name} requires a source reference`);
  if (
    Object.keys(fact.source).some(
      (k) => !['kind', 'reference', 'field', 'recordKey', 'decisionId'].includes(k),
    )
  )
    throw new Error(`${name} unsupported source properties`);
  if (
    typeof fact.source.kind !== 'string' ||
    !['supplier', 'shopify', 'manual-review', 'fixture', 'image-classification'].includes(
      fact.source.kind,
    )
  )
    throw new Error(`${name} invalid source kind`);
  if (
    fact.source.kind === 'image-classification' &&
    (fact.authority !== 'classified' ||
      ![
        'colourFamily',
        'colourTemperature',
        'colourLightness',
        'colourSaturation',
        'patternClass',
        'surface',
        'sheen',
      ].includes(name))
  )
    throw new Error('Image classification cannot claim technical fields or stronger authority');
  for (const key of ['field', 'recordKey', 'decisionId'])
    if (fact.source[key] !== undefined && !isText(fact.source[key]))
      throw new Error(`${name} invalid source ${key}`);
  if (fact.note !== undefined && !isText(fact.note)) throw new Error(`${name} invalid note`);
  if (
    fact.source.kind === 'manual-review' &&
    (!isText(fact.source.decisionId) || !['classified', 'verified'].includes(fact.authority))
  )
    throw new Error(`${name} manual review requires decision provenance and permitted authority`);
  if (fact.source.kind !== 'manual-review' && fact.source.decisionId !== undefined)
    throw new Error(`${name} review decision cannot impersonate another source kind`);
  if (fact.supportingAssertions !== undefined) {
    if (!Array.isArray(fact.supportingAssertions) || !fact.supportingAssertions.length)
      throw new Error(`${name} requires nonempty supporting assertions`);
    for (const assertion of fact.supportingAssertions) {
      if (!isObject(assertion) || 'supportingAssertions' in assertion)
        throw new Error(`${name} invalid supporting assertion`);
      assertFact(name, assertion);
      if (
        assertion.authority !== fact.authority ||
        !equalCatalogueValues(name, assertion.value, fact.value)
      )
        throw new Error(`${name} inconsistent supporting assertion`);
    }
  }
}

/** Runtime shape validation, not permission to publish. External data must use ingestion + its gate. */
export function compileCanonicalFabric(record: unknown): CanonicalFabric {
  if (!isObject(record)) throw new Error('fabric must be an object');
  if (!isMachineId(record.id)) throw new Error('fabric id must be stable machine text');
  if (!isText(record.sourceKey)) throw new Error('sourceKey is required');
  if (!isText(record.displayName)) throw new Error('displayName is required');
  const metadata = [
    'id',
    'sourceKey',
    'displayName',
    'supplierName',
    'collectionName',
    'unknownFields',
    'sourceRecords',
    'fingerprintRef',
    'visualFingerprintRef',
  ];
  for (const field of Object.keys(record))
    if (!metadata.includes(field) && !(catalogueFieldNames as readonly string[]).includes(field))
      throw new Error(`Unknown canonical field: ${field}`);
  for (const field of ['supplierName', 'collectionName'])
    if (record[field] !== undefined && !isText(record[field])) throw new Error(`Invalid ${field}`);
  if (record.visualFingerprintRef !== undefined) {
    const ref = record.visualFingerprintRef;
    if (
      !isObject(ref) ||
      Object.keys(ref).sort().join(',') !== 'digest,version' ||
      ref.version !== 'colourway-visual-fingerprint-v1' ||
      typeof ref.digest !== 'string' ||
      !/^sha256:[a-f0-9]{64}$/.test(ref.digest)
    )
      throw new Error('Invalid visual fingerprint reference');
  }
  if (record.fingerprintRef !== undefined) {
    const ref = record.fingerprintRef;
    if (
      !isObject(ref) ||
      Object.keys(ref).sort().join(',') !== 'digest,ontologyVersion,ruleVersion' ||
      typeof ref.digest !== 'string' ||
      !/^sha256:[a-f0-9]{64}$/.test(ref.digest) ||
      ref.ruleVersion !== 'description-rules-v1' ||
      ref.ontologyVersion !== 'fabric-vocabulary-v1'
    )
      throw new Error('Invalid fingerprint release reference');
  }

  for (const field of catalogueFieldNames) {
    if (Object.hasOwn(record, field)) assertFact(field, record[field]);
    const fact = record[field];
    if (
      isObject(fact) &&
      isObject(fact.source) &&
      fact.source.kind === 'image-classification' &&
      !record.visualFingerprintRef
    )
      throw new Error('Image-derived facts require visual release identity');
  }
  if (
    record.unknownFields !== undefined &&
    (!Array.isArray(record.unknownFields) ||
      record.unknownFields.some((f) => !catalogueFieldNames.includes(f)) ||
      new Set(record.unknownFields).size !== record.unknownFields.length)
  )
    throw new Error('Invalid unknown field inventory');
  if (
    record.sourceRecords !== undefined &&
    (!Array.isArray(record.sourceRecords) ||
      !record.sourceRecords.length ||
      record.sourceRecords.some(
        (s) =>
          !isObject(s) ||
          Object.keys(s).some((k) => !['recordKey', 'reference', 'kind'].includes(k)) ||
          !isText(s.recordKey) ||
          !isText(s.reference) ||
          typeof s.kind !== 'string' ||
          !['supplier', 'shopify', 'manual-review', 'fixture'].includes(s.kind),
      ))
  )
    throw new Error('Invalid source record provenance');
  if (
    Array.isArray(record.sourceRecords) &&
    new Set(record.sourceRecords.map((s) => s.recordKey)).size !== record.sourceRecords.length
  )
    throw new Error('Duplicate source record provenance');
  if (!record.sourceRecords && !catalogueFieldNames.some((field) => Object.hasOwn(record, field)))
    throw new Error('Canonical fabric requires source provenance');
  const unknownFields = catalogueFieldNames.filter((field) => {
    const fact = record[field];
    return !isObject(fact) || fact.authority === 'unknown' || fact.value === 'unknown';
  });
  const result = structuredClone({ ...record, unknownFields }) as unknown as CanonicalFabric;
  result.sourceRecords?.sort((a, b) =>
    a.recordKey < b.recordKey ? -1 : a.recordKey > b.recordKey ? 1 : 0,
  );
  return result;
}

export function catalogueIntegrity(catalogue: readonly CanonicalFabric[]): string[] {
  const errors: string[] = [],
    ids = new Set<string>(),
    sourceKeys = new Set<string>();
  for (const fabric of catalogue) {
    try {
      const checked = compileCanonicalFabric(fabric);
      if (ids.has(checked.id)) errors.push(`duplicate fabric id: ${checked.id}`);
      ids.add(checked.id);
      if (sourceKeys.has(checked.sourceKey))
        errors.push(`duplicate source key: ${checked.sourceKey}`);
      sourceKeys.add(checked.sourceKey);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return errors;
}
