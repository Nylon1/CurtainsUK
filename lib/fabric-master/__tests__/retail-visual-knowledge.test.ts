import '../../../scripts/curtainsuk-server-script-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { visualKnowledgeByFabricIds, customerGuidance, customerIntelligence, type VisualRow } from '../visual-knowledge';
import { retailFabricDetail } from '../retail-repository';

const enriched: VisualRow = {
  fabric_id: 'sdg-nmel120071', knowledge_state: 'PARTIAL_GOVERNED',
  visual_fields: {
    primaryColour: { value: 'cream', confidence: 'HIGH' },
    secondaryColours: { value: ['red', 'white'], confidence: 'HIGH' },
    patternClass: { value: 'statement', confidence: 'HIGH' },
    motif: { value: ['animal'], confidence: 'HIGH' },
  },
};
const complete: VisualRow = { ...enriched, fabric_id: 'complete', knowledge_state: 'COMPLETE' };
const pending: VisualRow = {
  fabric_id: 'sdg-f1321-07', knowledge_state: 'PENDING_EXTERNAL_RETRY',
  visual_fields: {
    primaryColour: { value: 'unknown', confidence: 'REVIEW' },
    visualSurface: { value: ['visible-weave'], confidence: 'MEDIUM' },
    character: { value: ['understated'], confidence: 'MEDIUM' },
  },
};

test('retail detail reads governed enrichment without publishing pending evidence', async (t) => {
  const priorUrl = process.env.SUPABASE_URL;
  const priorSecret = process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_URL = 'https://fabric-reader-test.invalid';
  process.env.SUPABASE_SECRET_KEY = 'test-only-key';
  t.after(() => {
    if (priorUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = priorUrl;
    if (priorSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = priorSecret;
  });
  const calls: URL[] = [];
  let reply: (url: URL) => Response = () => Response.json([]);
  // Exercise the real PostgREST builder, keeping every request in this test.
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.origin, 'https://fabric-reader-test.invalid');
    calls.push(url);
    return reply(url);
  });

  await t.test('empty selection performs no database request', async () => {
    assert.equal((await visualKnowledgeByFabricIds([])).size, 0);
    assert.equal(calls.length, 0);
  });

  await t.test('one bounded enriched read retains COMPLETE and PARTIAL_GOVERNED colour and guidance', async () => {
    calls.length = 0;
    reply = () => Response.json([enriched, complete]);
    const result = await visualKnowledgeByFabricIds([enriched.fabric_id, complete.fabric_id]);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].pathname, '/rest/v1/fabric_visual_knowledge_enriched');
    assert.equal(calls[0].searchParams.get('fabric_id'), 'in.(sdg-nmel120071,complete)');
    assert.equal(calls[0].searchParams.get('knowledge_state'), 'in.(COMPLETE,PARTIAL_GOVERNED)');
    assert.equal(result.size, 2);
    assert.equal(result.get(enriched.fabric_id)?.palette?.primary, 'cream');
    assert.match(customerGuidance(result.get(enriched.fabric_id)).colour ?? '', /Let cream anchor/);
    const colour = customerIntelligence(result.get(enriched.fabric_id))?.dimensions.find(d => d.key === 'colour');
    assert.deepEqual(colour?.values, ['cream', 'red', 'white']);
  });

  await t.test('pending and unrecognised states cannot produce public intelligence even with known fields', async () => {
    reply = () => Response.json([pending, { ...enriched, fabric_id: 'unknown-state', knowledge_state: 'NEW_STATE' }]);
    const result = await visualKnowledgeByFabricIds([pending.fabric_id, 'unknown-state']);
    assert.equal(result.size, 0);
    assert.equal(customerIntelligence(result.get(pending.fabric_id)), undefined);
    assert.deepEqual(customerGuidance(result.get(pending.fabric_id)), {});
  });

  await t.test('an empty enriched result never falls back to stale cache evidence', async () => {
    calls.length = 0;
    reply = () => Response.json([]);
    assert.equal((await visualKnowledgeByFabricIds([pending.fabric_id])).size, 0);
    assert.equal(calls.length, 1);
  });

  await t.test('rollback fallback uses the same governed-state restriction', async () => {
    calls.length = 0;
    reply = (url) => url.pathname.endsWith('fabric_visual_knowledge_enriched')
      ? Response.json({ code: 'PGRST205', message: "Could not find the table 'curtainsuk_private.fabric_visual_knowledge_enriched' in the schema cache" }, { status: 404 })
      : Response.json([complete, pending]);
    const result = await visualKnowledgeByFabricIds([complete.fabric_id, pending.fabric_id]);
    assert.deepEqual(calls.map(url => url.pathname), [
      '/rest/v1/fabric_visual_knowledge_enriched', '/rest/v1/fabric_visual_knowledge_read_cache',
    ]);
    for (const url of calls) {
      assert.equal(url.searchParams.get('knowledge_state'), 'in.(COMPLETE,PARTIAL_GOVERNED)');
      assert.equal(url.searchParams.get('fabric_id'), 'in.(complete,sdg-f1321-07)');
    }
    assert.deepEqual([...result.keys()], ['complete']);
  });

  await t.test('permission errors remain visible and do not fall back', async () => {
    calls.length = 0;
    reply = () => Response.json({ code: '42501', message: 'permission denied' }, { status: 403 });
    await assert.rejects(visualKnowledgeByFabricIds([enriched.fabric_id]), /FABRIC_VISUAL_KNOWLEDGE_UNAVAILABLE/);
    assert.equal(calls.length, 1);
  });

  await t.test('detail hydration preserves fabric facts, images and commerce while omitting pending intelligence', async () => {
    const image = 'https://cdn.shopify.com/test-fabric.jpg';
    reply = (url) => {
      switch (url.pathname) {
        case '/rest/v1/fabric_colourways': return Response.json([{
          fabric_id: pending.fabric_id, supplier_id: 'sanderson-design-group', supplier_sku: 'F1321/07',
          brand_id: 'clarke-clarke', design_id: 'logan', colour_name: 'Teal', colourway_code: '07',
          lifecycle_state: 'CURRENT', staging_catalog_visible: true, storefront_selectable: true,
          imagery: [image], supplier_brands: { display_name: 'Clarke & Clarke' },
          fabric_designs: {
            display_name: 'Logan', collection_id: 'test', supplier_design_code: 'F1321',
            fabric_collections: { display_name: 'Test collection' }, full_width_mm: 1370,
            usable_width_mm: null, vertical_repeat_mm: 0, horizontal_repeat_mm: 0,
            pattern_match_type: 'PLAIN', composition: [{ material: 'Polyester', percentage: 100 }],
            weight_gsm: 280, usage_suitability: ['Curtains'],
          },
        }]);
        case '/rest/v1/fabric_retail_profiles': return Response.json([]);
        case '/rest/v1/fabric_media_mappings': return Response.json([{
          fabric_id: pending.fabric_id, supplier_id: 'sanderson-design-group', supplier_sku: 'F1321/07',
          image_type: 'MAIN', fabric_media_assets: { shopify_cdn_url: image, width: 600, height: 600 },
        }]);
        case '/rest/v1/rpc/fabric_commercial_evidence': return Response.json([{
          fabric_id: pending.fabric_id, stock: 'FABRIC_AVAILABLE', stale: false,
          sample_stock_available: true, price_confirmed: true,
        }]);
        case '/rest/v1/fabric_visual_knowledge_enriched': return Response.json([pending]);
        default: throw Error(`Unexpected test request: ${url.pathname}`);
      }
    };
    const detail = await retailFabricDetail(pending.fabric_id);
    assert.ok(detail);
    assert.equal(detail.id, pending.fabric_id);
    assert.equal(detail.colour, 'Teal');
    assert.equal(detail.fullWidthMm, 1370);
    assert.deepEqual(detail.composition, [{ material: 'Polyester', percentage: 100 }]);
    assert.deepEqual(detail.imageReferences, [image]);
    assert.equal(detail.sampleAvailable, true);
    assert.equal(detail.orderReady, true);
    for (const key of ['visualIntelligence', 'intelligence', 'fabricIntelligenceGuidance']) {
      assert.equal(key in detail, false);
    }

    calls.length = 0;
    assert.deepEqual(await retailFabricDetail(pending.fabric_id, false, { includeIntelligence: false }), detail);
    assert.equal(calls.some(url => url.pathname.includes('visual_knowledge')), false,
      'Room Visualiser retains its existing intelligence opt-out and bounded reads');
  });
});
