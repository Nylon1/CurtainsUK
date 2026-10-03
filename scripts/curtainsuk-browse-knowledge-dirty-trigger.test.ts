import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const migration = readFileSync(
  resolve('supabase/migrations/20261003174058_browse_knowledge_dirty_scope_columns.sql'),
  'utf8',
);

test('commercial promotion dirties only the affected Browse row, while FI scope changes dirty the knowledge cache', async () => {
  const db = await PGlite.create();
  try {
    await db.exec(`
      CREATE SCHEMA curtainsuk_private;
      CREATE TABLE curtainsuk_private.fabric_colourways (
        fabric_id text PRIMARY KEY, supplier_id text, supplier_sku text,
        brand_id text, design_id text, staging_catalog_visible boolean,
        lifecycle_state text, colour_name text, storefront_selectable boolean,
        price_verification_status text, updated_at timestamptz
      );
      CREATE TABLE curtainsuk_private.browse_projection_control (
        knowledge_cache_dirty boolean NOT NULL DEFAULT false
      );
      INSERT INTO curtainsuk_private.browse_projection_control DEFAULT VALUES;
      CREATE TABLE curtainsuk_private.browse_projection_dirty (fabric_id text PRIMARY KEY);
      CREATE FUNCTION curtainsuk_private.browse_projection_mark_knowledge_dirty()
      RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        UPDATE curtainsuk_private.browse_projection_control
          SET knowledge_cache_dirty = true;
        RETURN NULL;
      END $$;
      CREATE FUNCTION curtainsuk_private.browse_projection_mark_fabric_dirty()
      RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        INSERT INTO curtainsuk_private.browse_projection_dirty(fabric_id)
          VALUES (NEW.fabric_id) ON CONFLICT DO NOTHING;
        RETURN NULL;
      END $$;
      INSERT INTO curtainsuk_private.fabric_colourways VALUES
        ('pt-safe','prestigious-textiles','SAFE/001','pt','safe',true,'UNKNOWN',
         'Blue',false,'VERIFIED',now());
      CREATE TRIGGER browse_projection_knowledge_dirty
        AFTER INSERT OR UPDATE OR DELETE ON curtainsuk_private.fabric_colourways
        FOR EACH STATEMENT
        EXECUTE FUNCTION curtainsuk_private.browse_projection_mark_knowledge_dirty();
      CREATE TRIGGER browse_projection_fabric_dirty
        AFTER UPDATE ON curtainsuk_private.fabric_colourways
        FOR EACH ROW
        EXECUTE FUNCTION curtainsuk_private.browse_projection_mark_fabric_dirty();
    `);
    await db.exec(migration);
    const dirty = async () => (await db.query<{ knowledge_cache_dirty: boolean }>(
      'SELECT knowledge_cache_dirty FROM curtainsuk_private.browse_projection_control',
    )).rows[0].knowledge_cache_dirty;
    const browseQueue = async () => (await db.query<{ count: number }>(
      'SELECT count(*)::integer AS count FROM curtainsuk_private.browse_projection_dirty',
    )).rows[0].count;

    await db.exec(`UPDATE curtainsuk_private.fabric_colourways SET
      storefront_selectable=true, price_verification_status='VERIFIED',
      updated_at=now() WHERE fabric_id='pt-safe'`);
    assert.equal(await dirty(), false);
    assert.equal(await browseQueue(), 1);

    await db.exec(`UPDATE curtainsuk_private.fabric_colourways
      SET staging_catalog_visible=false WHERE fabric_id='pt-safe'`);
    assert.equal(await dirty(), true);
    await db.exec('UPDATE curtainsuk_private.browse_projection_control SET knowledge_cache_dirty=false');
    await db.exec(`UPDATE curtainsuk_private.fabric_colourways
      SET colour_name='Green' WHERE fabric_id='pt-safe'`);
    assert.equal(await dirty(), true);

    await db.exec('UPDATE curtainsuk_private.browse_projection_control SET knowledge_cache_dirty=false');
    await db.exec(`INSERT INTO curtainsuk_private.fabric_colourways
      (fabric_id, supplier_id, supplier_sku, brand_id, design_id,
       staging_catalog_visible, lifecycle_state, colour_name)
      VALUES ('pt-new','prestigious-textiles','NEW/001','pt','new',true,'CURRENT','Red')`);
    assert.equal(await dirty(), true);
    await db.exec('UPDATE curtainsuk_private.browse_projection_control SET knowledge_cache_dirty=false');
    await db.exec(`DELETE FROM curtainsuk_private.fabric_colourways WHERE fabric_id='pt-new'`);
    assert.equal(await dirty(), true);
  } finally {
    await db.close();
  }
});
