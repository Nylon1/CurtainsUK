import '../../../scripts/curtainsuk-server-script-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { queryVisualKnowledgeWithFallback, enrichedRelationMissing } from '../visual-knowledge-source';
import { mapVisualKnowledgeRow, customerGuidance, customerIntelligence, type VisualRow } from '../visual-knowledge';
import { mapHciFabricKnowledge } from '../hci-visual-knowledge';

const row: VisualRow = {
  fabric_id: 'pt-1204-212', knowledge_state: 'PARTIAL_GOVERNED',
  visual_fields: {
    primaryColour: { value: 'pink', confidence: 'HIGH' },
    secondaryColours: { value: ['white'], confidence: 'MEDIUM' },
    patternClass: { value: 'botanical', confidence: 'HIGH' },
  },
};
const absent = { code: 'PGRST205', message: "Could not find the table 'curtainsuk_private.fabric_visual_knowledge_enriched' in the schema cache" };
const absentFromStaleCache = { code: '42P01', message: 'relation "curtainsuk_private.fabric_visual_knowledge_enriched" does not exist' };

test('enriched relation present: uses enriched source only', async () => {
  const sources: string[] = [];
  const result = await queryVisualKnowledgeWithFallback(async (source) => {
    sources.push(source);
    return { data: [row], error: null };
  }, 'fabric_visual_knowledge_enriched', 'fabric_visual_knowledge_read_cache');
  assert.deepEqual(sources, ['fabric_visual_knowledge_enriched']);
  assert.deepEqual(result.data, [row]);
  assert.equal(result.data?.[0].knowledge_state, 'PARTIAL_GOVERNED');
});

test('only exact enriched-relation absence retries the identical cache query', async () => {
  for (const missing of [absent, absentFromStaleCache]) {
    const sources: string[] = [];
    const result = await queryVisualKnowledgeWithFallback(async (source) => {
      sources.push(source);
      return source === 'fabric_visual_knowledge_enriched'
        ? { data: null, error: missing }
        : { data: [row], error: null };
    }, 'fabric_visual_knowledge_enriched', 'fabric_visual_knowledge_read_cache');
    assert.deepEqual(sources, ['fabric_visual_knowledge_enriched', 'fabric_visual_knowledge_read_cache']);
    assert.deepEqual(result.data, [row]);
    assert.equal(result.data?.[0].knowledge_state, 'PARTIAL_GOVERNED');
  }
});

test('permission, timeout, schema and other errors never fall back', async () => {
  const otherErrors = [
    { code: '42501', message: 'permission denied for view fabric_visual_knowledge_enriched' },
    { code: '57014', message: 'canceling statement due to statement timeout' },
    { code: 'PGRST204', message: 'Could not find a column in the schema cache' },
    { code: 'PGRST205', message: "Could not find the table 'curtainsuk_private.other_table' in the schema cache" },
    { code: '42P01', message: 'relation "curtainsuk_private.fabric_media_assets" does not exist' },
  ];
  for (const error of otherErrors) {
    const sources: string[] = [];
    const result = await queryVisualKnowledgeWithFallback(async (source) => {
      sources.push(source);
      return { data: null, error };
    }, 'fabric_visual_knowledge_enriched', 'fabric_visual_knowledge_read_cache');
    assert.deepEqual(sources, ['fabric_visual_knowledge_enriched']);
    assert.deepEqual(result.error, error);
    assert.equal(enrichedRelationMissing(error), false);
  }
  const sources: string[] = [];
  await assert.rejects(queryVisualKnowledgeWithFallback(async (source) => {
    sources.push(source);
    throw new Error('network unavailable');
  }, 'fabric_visual_knowledge_enriched', 'fabric_visual_knowledge_read_cache'), /network unavailable/);
  assert.deepEqual(sources, ['fabric_visual_knowledge_enriched']);
});

test('zero-patch enriched and cache rows have identical FI outputs and state', async () => {
  const resultBySource = new Map([
    ['fabric_visual_knowledge_enriched', structuredClone(row)],
    ['fabric_visual_knowledge_read_cache', structuredClone(row)],
  ]);
  const outputs = [];
  for (const source of resultBySource.keys()) {
    const sourceRow = resultBySource.get(source)!;
    const visual = mapVisualKnowledgeRow(sourceRow);
    outputs.push({
      state: sourceRow.knowledge_state,
      visual,
      hci: mapHciFabricKnowledge(sourceRow),
      guidance: customerGuidance(visual),
      intelligence: customerIntelligence(visual),
    });
  }
  assert.deepEqual(outputs[0], outputs[1]);
});
