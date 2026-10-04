import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

// Exercise the production batch's actual read-before-write guard. The fixture
// has both source artifact formats and the structured field provenance that
// caused the 3 October canary to roll back.
const publication = readFileSync(resolve('scripts/curtainsuk-activate-hybrid-registrations.sql'), 'utf8')
  .replace(/\r\n/g, '\n');
const guardStart = publication.indexOf('  SELECT count(*) INTO bad_count\n  FROM curtainsuk_private.fabric_hybrid_registrations r');
const guardEnd = publication.indexOf('\n  IF bad_count<>0', guardStart);
assert.ok(guardStart >= 0 && guardEnd > guardStart, 'production guard must be present');
const guard = publication.slice(guardStart, guardEnd)
  .replace('SELECT count(*) INTO bad_count', 'SELECT count(*) AS bad_count')
  .replace('ANY(target_ids)', "ANY(ARRAY['sdg-canary']::text[])");
const registrationMigration = readFileSync(resolve('supabase/migrations/20261003071017_fabric_hybrid_artifact_registration.sql'), 'utf8');
const activeIndex = registrationMigration.match(/CREATE UNIQUE INDEX fabric_hybrid_one_active_per_fabric[^;]+;/)?.[0] ?? '';
assert.ok(activeIndex, 'protected migration must constrain active registrations per fabric');

async function fixture(rawReadingKey: 'v1_compatible_reading' | 'final_v1_compatible_reading') {
  const pg = await PGlite.create({ extensions: { pgcrypto } });
  const candidate = { observations: { primaryColour: { value: 'blue', confidence: 'HIGH' } } };
  const raw = { [rawReadingKey]: candidate };
  const rawProvenance = { primaryColour: rawReadingKey === 'v1_compatible_reading'
    ? 'colourway_inference'
    : { source_basis: 'colourway_inference', reason: 'verified image', interpretation: 'blue' } };
  await pg.exec(`
    CREATE SCHEMA curtainsuk_private; CREATE SCHEMA extensions;
    CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
    CREATE TABLE curtainsuk_private.fabric_hybrid_registrations (
      registration_id text, fabric_id text, document_id text, run_id text, artifact_id text,
      supplier_id text, supplier_sku text, brand_id text, design_id text,
      approved_image_type text, approved_image_hash text, approved_image_url text,
      baseline_visual_hash text, baseline_provenance_hash text,
      source_manifest_entry jsonb, candidate jsonb, raw_field_provenance jsonb,
      delta_observations jsonb, delta_provenance_basis jsonb,
      review_state text, approval_state text, source_analysis_at timestamptz,
      active boolean, retired_at timestamptz, activated_at timestamptz);
    CREATE TABLE curtainsuk_private.fabric_hybrid_documents (
      document_id text, fabric_id text, run_id text, artifact_id text,
      source_document_text text, source_sha256 text);
    CREATE TABLE curtainsuk_private.fabric_hybrid_artifacts (
      run_id text, artifact_id text, completed_successfully boolean,
      source_manifest_sha256 text, started_at timestamptz);
    CREATE TABLE curtainsuk_private.fabric_visual_knowledge_patches (
      patch_id text, fabric_id text, retired_at timestamptz);
    CREATE TABLE curtainsuk_private.fabric_colourways (
      fabric_id text, supplier_id text, supplier_sku text, brand_id text, design_id text,
      colour_name text, staging_catalog_visible boolean, lifecycle_state text);
    CREATE TABLE curtainsuk_private.fabric_media_mappings (
      fabric_id text, supplier_id text, supplier_sku text, image_type text,
      content_hash text, rights_state text, mapping_state text);
    CREATE TABLE curtainsuk_private.fabric_media_assets (
      content_hash text, shopify_cdn_url text, width integer, height integer);
    CREATE TABLE curtainsuk_private.fabric_visual_enrichment_failures (
      supplier_id text, context jsonb, failure_reason text, failed_at timestamptz);
    CREATE TABLE fi_before (
      fabric_id text, supplier_id text, supplier_sku text, knowledge_state text,
      visual_fields jsonb, provenance jsonb);
    CREATE VIEW curtainsuk_private.fabric_visual_knowledge AS SELECT * FROM fi_before;
  `);
  await pg.exec(activeIndex);
  const imageHash = 'a'.repeat(64);
  const imageUrl = `https://cdn.shopify.com/s/files/1/cuk-${imageHash}.jpg`;
  await pg.query(`INSERT INTO fi_before VALUES ($1,$2,$3,'PENDING_EXTERNAL_RETRY',$4::jsonb,$5::jsonb)`,
    ['sdg-canary', 'sanderson-design-group', 'F1/01',
      JSON.stringify({ primaryColour: { value: 'unknown', confidence: 'REVIEW' } }),
      JSON.stringify({ primaryColour: 'not_applicable' })]);
  await pg.query(`INSERT INTO curtainsuk_private.fabric_hybrid_documents
    VALUES ('doc','sdg-canary','run','artifact',$1,
      encode(extensions.digest(convert_to($1,'UTF8'),'sha256'),'hex'))`, [JSON.stringify(raw)]);
  await pg.query(`INSERT INTO curtainsuk_private.fabric_hybrid_artifacts
    VALUES ('run','artifact',true,$1,'2026-10-01T12:00:00Z')`,
    ['e31c872b24468d617cba5b485e38e9c4b8ef080e6001cea0bd5b8a0031cc63fd']);
  await pg.query(`INSERT INTO curtainsuk_private.fabric_colourways
    VALUES ('sdg-canary','sanderson-design-group','F1/01','brand','design','Blue',true,'UNKNOWN')`);
  await pg.query(`INSERT INTO curtainsuk_private.fabric_media_mappings
    VALUES ('sdg-canary','sanderson-design-group','F1/01','MAIN',$1,'APPROVED','VERIFIED')`, [imageHash]);
  await pg.query(`INSERT INTO curtainsuk_private.fabric_media_assets VALUES ($1,$2,800,800)`,
    [imageHash, imageUrl]);
  await pg.query(`INSERT INTO curtainsuk_private.fabric_visual_enrichment_failures
    VALUES ('sanderson-design-group','{"design_id":"design"}'::jsonb,'OPENAI_RESPONSE_429','2026-09-30T12:00:00Z')`);
  await pg.query(`INSERT INTO curtainsuk_private.fabric_hybrid_registrations
    SELECT 'registration','sdg-canary','doc','run','artifact','sanderson-design-group',
      'F1/01','brand','design','MAIN',$1,$2,
      encode(extensions.digest(k.visual_fields::text,'sha256'),'hex'),
      encode(extensions.digest(k.provenance::text,'sha256'),'hex'),
      $3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,
      'REVIEW_REQUIRED','PROPOSED',NULL,false,NULL,NULL
    FROM fi_before k`, [imageHash, imageUrl,
    JSON.stringify({ fabric_id: 'sdg-canary', provenance: rawProvenance }),
    JSON.stringify(candidate), JSON.stringify(rawProvenance),
    JSON.stringify(candidate.observations),
    JSON.stringify({ primaryColour: 'colourway_inference' })]);
  return pg;
}

async function badCount(pg: PGlite) {
  const result = await pg.query<{ bad_count: number }>(guard);
  return Number(result.rows[0].bad_count);
}

for (const key of ['v1_compatible_reading', 'final_v1_compatible_reading'] as const) {
  test(`accepts ${key} with exact source provenance`, async () => {
    const pg = await fixture(key);
    try { assert.equal(await badCount(pg), 0); } finally { await pg.close(); }
  });
}

for (const [name, mutation] of [
  ['stale baseline hash', `UPDATE curtainsuk_private.fabric_hybrid_registrations SET baseline_visual_hash='stale'`],
  ['changed approved image', `UPDATE curtainsuk_private.fabric_media_mappings SET content_hash='changed'`],
  ['existing governed observation', `UPDATE fi_before SET visual_fields=jsonb_set(visual_fields,'{primaryColour}', '{"value":"red","confidence":"HIGH"}'::jsonb)`],
  ['candidate value mismatch', `UPDATE curtainsuk_private.fabric_hybrid_registrations SET delta_observations='{"primaryColour":{"value":"green","confidence":"HIGH"}}'::jsonb`],
  ['provenance mismatch', `UPDATE curtainsuk_private.fabric_hybrid_registrations SET delta_provenance_basis='{"primaryColour":"unknown_source"}'::jsonb`],
  ['already active registration', `UPDATE curtainsuk_private.fabric_hybrid_registrations SET active=true`],
  ['later supplier failure', `UPDATE curtainsuk_private.fabric_visual_enrichment_failures SET failed_at='2026-10-02T12:00:00Z'`],
] as const) {
  test(`rejects ${name}`, async () => {
    const pg = await fixture('final_v1_compatible_reading');
    try {
      await pg.exec(mutation);
      assert.equal(await badCount(pg), 1);
    } finally { await pg.close(); }
  });
}

test('protected registration index rejects a second active registration for one fabric', async () => {
  const pg = await fixture('final_v1_compatible_reading');
  try {
    await pg.exec(`UPDATE curtainsuk_private.fabric_hybrid_registrations SET active=true`);
    await assert.rejects(
      pg.exec(`INSERT INTO curtainsuk_private.fabric_hybrid_registrations
        (registration_id,fabric_id,active) VALUES ('duplicate','sdg-canary',true)`),
      /unique/i,
    );
  } finally { await pg.close(); }
});
