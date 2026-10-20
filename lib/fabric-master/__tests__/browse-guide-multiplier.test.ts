import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migration = readFileSync('supabase/migrations/20261020124923_browse_guide_two_times_trade.sql', 'utf8');
const projection = readFileSync('supabase/migrations/20260925085155_browse_governed_projection_read_model.sql', 'utf8');
const refreshStart = projection.indexOf('CREATE FUNCTION curtainsuk_private.browse_projection_refresh_full()');
const refresh = projection.slice(refreshStart, projection.indexOf('$function$;', refreshStart) + 11);

test('two-times guide applies to SQL readers and reconciled prepared rows, including repeat execution', async () => {
  const pg = await PGlite.create();
  try {
    await pg.exec(`
      CREATE SCHEMA curtainsuk_private;
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE TABLE curtainsuk_private.supplier_snapshots (
        snapshot_id text, supplier_id text, supplier_sku text, validation_status text,
        checked_at timestamptz, source_type text, source_name text);
      CREATE TABLE curtainsuk_private.supplier_snapshot_prices (
        snapshot_id text, cut_trade_price numeric, standard_trade_price numeric, currency text);
      CREATE TABLE curtainsuk_private.supplier_promotion_events (
        snapshot_id text, promotion_state text, created_at timestamptz, event_id int);
      CREATE TABLE curtainsuk_private.browse_read_projection (
        generation_id uuid, fabric_id text, supplier_id text, supplier_sku text, guide_minor bigint);
      CREATE TABLE curtainsuk_private.browse_projection_dirty (fabric_id text);
      CREATE TABLE curtainsuk_private.browse_projection_control (
        singleton boolean, active_generation uuid, refreshed_at timestamptz,
        knowledge_cache_dirty boolean, knowledge_cache_refreshed_at timestamptz,
        next_time_change_at timestamptz, metadata jsonb);
      INSERT INTO curtainsuk_private.browse_projection_control VALUES
        (true, gen_random_uuid(), now(), false, now(), 'infinity', '{}');
      CREATE MATERIALIZED VIEW curtainsuk_private.fabric_visual_knowledge_read_cache AS
        SELECT now() AS refreshed_at;
      CREATE FUNCTION curtainsuk_private.browse_projection_metadata(uuid) RETURNS jsonb
        LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
      CREATE FUNCTION curtainsuk_private.browse_projection_next_time_change() RETURNS timestamptz
        LANGUAGE sql AS $$ SELECT 'infinity'::timestamptz $$;
      CREATE VIEW curtainsuk_private.browse_current_guide_prices_set_v1 WITH (security_invoker=true) AS
        SELECT ''::text supplier_id, ''::text supplier_sku, 0::bigint guide_minor WHERE false;
      CREATE VIEW curtainsuk_private.browse_eligible_set_v1 AS
        SELECT supplier_id || ':' || supplier_sku AS fabric_id, g.*
        FROM curtainsuk_private.browse_current_guide_prices_set_v1 g;
    `);
    await pg.exec(refresh);
    const cases = [
      ['a', 'sanderson-design-group', '20', 4000],
      ['b', 'sanderson-design-group', '14.995', 3000],
      ['b2', 'sanderson-design-group', '29.995', 6000],
      ['c', 'sanderson-design-group', '49.995', 10000],
      ['d', 'sanderson-design-group', '74.995', 15000],
      ['e', 'sanderson-design-group', '124.995', 25000],
      ['pt-pdf-cut:f', 'prestigious-textiles', '25', 5000],
    ] as const;
    for (const [id, supplier, price] of cases) {
      await pg.query(`INSERT INTO curtainsuk_private.supplier_snapshots VALUES
        ($1,$2,$1,'VALIDATED',now()-interval '1 day','OTHER',
         'Prestigious Textiles August 2026 Price List; owner-confirmed Cut Price')`, [id, supplier]);
      await pg.query('INSERT INTO curtainsuk_private.supplier_snapshot_prices VALUES ($1,$2,19,\'GBP\')', [id, price]);
      await pg.query(`INSERT INTO curtainsuk_private.supplier_promotion_events VALUES
        ($1,'APPROVED_FOR_PROJECTION',now()-interval '1 day',1)`, [id]);
    }
    // Latest rejection must still remove evidence from both guide readers.
    await pg.exec(`INSERT INTO curtainsuk_private.supplier_promotion_events VALUES
      ('a','REJECTED',now(),2);
      INSERT INTO curtainsuk_private.browse_read_projection
        SELECT active_generation,'old','old','old',6000 FROM curtainsuk_private.browse_projection_control;`);
    for (let run = 0; run < 2; run++) {
      await pg.exec(migration);
      const expected = cases.slice(1).map(([id, supplier, , amount]) => ({supplier_id:supplier,supplier_sku:id,guide_minor:amount}))
        .sort((a,b) => a.supplier_sku.localeCompare(b.supplier_sku));
      const direct = await pg.query('SELECT * FROM curtainsuk_private.current_retail_guide_prices() ORDER BY supplier_sku');
      const view = await pg.query('SELECT * FROM curtainsuk_private.browse_current_guide_prices_set_v1 ORDER BY supplier_sku');
      const prepared = await pg.query(`SELECT p.supplier_id,p.supplier_sku,p.guide_minor
        FROM curtainsuk_private.browse_read_projection p JOIN curtainsuk_private.browse_projection_control c
        ON p.generation_id=c.active_generation ORDER BY p.supplier_sku`);
      for (const result of [direct, view, prepared]) assert.deepEqual(result.rows, expected);
      const band = await pg.query(`SELECT supplier_sku FROM curtainsuk_private.browse_read_projection
        WHERE guide_minor>=3000 AND guide_minor<6000 ORDER BY supplier_sku`);
      assert.deepEqual(band.rows, [{supplier_sku:'b'},{supplier_sku:'pt-pdf-cut:f'}]);
      const permissions = await pg.query<{allowed:boolean}>(`SELECT has_table_privilege('anon',
        'curtainsuk_private.browse_current_guide_prices_set_v1','SELECT') AS allowed`);
      assert.equal(permissions.rows[0].allowed, false);
      const callable = await pg.query<{allowed:boolean}>(`SELECT has_function_privilege('anon',
        'curtainsuk_private.current_retail_guide_prices()','EXECUTE') AS allowed`);
      assert.equal(callable.rows[0].allowed, false);
    }
  } finally { await pg.close(); }
});
