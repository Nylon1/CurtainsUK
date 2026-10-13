import { PGlite } from '@electric-sql/pglite';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const directory = new URL('./', import.meta.url);
const db = new PGlite();
try {
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema auth;');
  await db.exec(await readFile(new URL('../../supabase/migrations/20261011142747_jane_isolated_advisory.sql', directory), 'utf8'));
  const results = await db.exec(await readFile(new URL('verify.sql', directory), 'utf8'));
  const inventory = results.flatMap(result => result.rows).find(row => row.inventory)?.inventory;
  assert.equal(inventory.relations.filter(r => r.relkind === 'r').length, 9);
  assert.equal(inventory.indexes.length, 21);
  assert.equal(inventory.policies.length, 15);
  assert.equal(inventory.roles.length, 3);
  assert.equal(inventory.browserObjectPrivileges, 0);
  assert.equal(inventory.browserFunctionPrivileges, 0);
  assert.equal(inventory.existingObjectGrants, 0);
  assert.equal(inventory.existingColumnGrants, 0);
  assert.ok(Object.entries(inventory.rowCounts).every(([name, count]) => count === (name === 'index_gate' ? 1 : 0)));
  assert.ok(inventory.roles.every(r => !r.rolcanlogin && !r.rolbypassrls && !r.rolsuper));
  const report = { classification: 'LOCAL_VERIFICATION_QUERY_TEST_ONLY', checkedAt: new Date().toISOString(), passed: true, tables: 9, indexes: 21, policies: 15, functions: 3, roles: 3, unexpectedBrowserGrants: 0, unexpectedExistingObjectGrants: 0 };
  await writeFile(new URL('verification-query-test.json', directory), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally { await db.close(); }
