export const BROWSE_KNOWLEDGE_KEYS = ['colour', 'pattern', 'texture', 'finish', 'character'] as const;
export type BrowseKnowledgeKey = typeof BROWSE_KNOWLEDGE_KEYS[number];

function browseFacetValues(params: URLSearchParams, key: BrowseKnowledgeKey) {
  return [...new Set((params.get(key) ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => /^[a-z0-9][a-z0-9 -]{0,79}$/.test(value) && value !== 'unknown')
    .slice(0, 12))];
}

/** Browser input only. The private query independently limits matching to governed values. */
export function governedBrowseFilters(params: URLSearchParams) {
  const filters: Record<string, string | string[]> = Object.fromEntries(
    ['query', 'brand', 'collection', 'sample', 'availability', 'window'].map((key) => [key, (params.get(key) ?? '').trim().slice(0, 100)]),
  );
  for (const key of BROWSE_KNOWLEDGE_KEYS) filters[key] = browseFacetValues(params, key);
  return filters;
}