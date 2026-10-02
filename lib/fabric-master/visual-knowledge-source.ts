export type VisualKnowledgeSource =
  | 'fabric_visual_knowledge_enriched'
  | 'fabric_visual_knowledge_read_cache';

type QueryError = { code: string; message: string };
type QueryResult<T> = { data: T | null; error: QueryError | null };

/** Only a missing enriched relation during migration or rollback permits fallback. */
export function enrichedRelationMissing(error: QueryError | null): boolean {
  if (!error) return false;
  if (error.code === 'PGRST205') {
    return /^Could not find the table '(?:curtainsuk_private\.)?fabric_visual_knowledge_enriched' in the schema cache(?:\b|$)/.test(error.message);
  }
  return error.code === '42P01' &&
    /^relation "(?:curtainsuk_private\.)?fabric_visual_knowledge_enriched" does not exist$/.test(error.message);
}

export async function queryVisualKnowledgeWithFallback<T>(
  query: (source: VisualKnowledgeSource) => PromiseLike<QueryResult<T>>,
  enrichedSource: 'fabric_visual_knowledge_enriched',
  cacheSource: 'fabric_visual_knowledge_read_cache',
): Promise<QueryResult<T>> {
  const enriched = await query(enrichedSource);
  if (!enrichedRelationMissing(enriched.error)) return enriched;
  return query(cacheSource);
}
