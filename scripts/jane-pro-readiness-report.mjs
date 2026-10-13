// Offline evidence assembly. No network, credentials or migration execution.
import {readFile,writeFile} from 'node:fs/promises';
import {safeKnowledge} from '../lib/advisory/catalogue.mjs';
import {knowledgeFields} from '../lib/advisory/index-worker.mjs';
import {validateSourceManifest} from '../lib/advisory/source-manifest.mjs';
const dir='artifacts/jane-pro-readiness-20261011',json=async file=>JSON.parse(await readFile(file,'utf8'));
const manifest=await json(dir+'/source-manifest.json'),identity=validateSourceManifest(manifest),migration=await json(dir+'/migration-objects.json'),tests=await json(dir+'/tests.json');
const sample=await json('artifacts/jane-completion/bounded-master-source.json'),fields={};
for(const row of sample.rows)for(const [field,present] of Object.entries(knowledgeFields(safeKnowledge(row,row.visual,row.profile))))fields[field]=(fields[field]??0)+Number(present);
const batches=Math.ceil(identity.count/6);
const coverage={classification:'IDENTITY_INVENTORY_COMPLETE_DESCRIPTIVE_INDEX_NOT_POPULATED',projectRef:manifest.projectRef,identityManifestObservedAt:manifest.observed_at,permittedKnowledgeIdentities:identity.count,identityHash:identity.hash,identityTraversalTested:identity.count,hostedAdvisoryIdentities:0,completeDescriptiveCoverage:false,localHistoricalRecordCount:sample.rows.length,localSampleFields:fields,wholeMasterFieldCoverage:null,purchasableCount:null,batches,maximumBatchesPerInvocation:20,minimumInvocations:Math.ceil(batches/20),minimumPacingSeconds:(batches-1)*5,standardFactRequests:batches*3,standardFactResponseCapBytes:batches*750000,note:'Identity-only inventory and local traversal do not demonstrate descriptive coverage. Pacing excludes queries, attestation, retries and pauses. Response cap is a transport bound, not observed DB I/O.'};
await writeFile(dir+'/coverage.json',JSON.stringify(coverage,null,2)+'\n');
const tables=migration.relations.filter(r=>r.relkind==='r').map(r=>r.relname);
const md=`# Exact advisory migration review manifest

**Unapproved. Not applied. Existing project ${manifest.projectRef} only.**

File: \`${migration.migration.migrationPath}\`

Canonical UTF-8/LF SHA-256: \`${migration.migration.sha256}\`

The official Supabase CLI 2.120.0 generated this filename. The six prepared review files are unchanged and assembled in their recorded order. Added protections are one atomic transaction, 500 ms lock timeout, 3 s statement timeout, existing-object/Auth-column preconditions, and final browser/service-role sequence revocation. [Machine-readable complete definitions, constraints, roles, ACLs and policies](migration-objects.json) and [source-file hashes](migration-bundle.json) are part of this review.

## Objects and existing impact

- One new schema: advisory.
- ${tables.length} new tables: ${tables.map(t=>'advisory.'+t).join(', ')}.
- ${migration.indexes.length} indexes, including primary/unique indexes and five GIN indexes. All build on new empty tables; no existing catalogue index build or full-table scan.
- One identity sequence: advisory.index_job_items_write_sequence_seq.
- ${migration.functions.length} SECURITY INVOKER functions: ${migration.functions.map(f=>'advisory.'+f.proname+'('+f.arguments+')').join('; ')}. Fixed statements, empty search_path, no arbitrary model SQL.
- ${migration.policies.length} policies. RLS enabled on every advisory table. Consultations additionally FORCE RLS. Database owner/administrators remain privileged; application connections must never use them.
- Four new NOLOGIN, NOINHERIT, non-superuser, non-BYPASSRLS roles: advisory_runtime, advisory_indexer, advisory_retention, advisory_auth_verifier. No role membership or password created.
- One initial coordination row: advisory.index_gate(id=1). Zero jobs, knowledge records, customer records or enabled model budgets seeded.
- Existing-object exception: USAGE on auth schema and SELECT(id,user_id,not_after) on auth.sessions granted only to the new Auth verifier. No existing Auth row, table definition or policy changes. Auth columns verified read-only on 11 October.
- The approved migration mechanism will record this version in Supabase migration history. No blanket replay of historical local migrations is allowed.
- No Master, pricing, stock, supplier, checkout, Naila or visualiser object changed. No extension, trigger, cron schedule, API schema exposure or public route is added.

## Resource estimate and lock behaviour

Local PGlite PostgreSQL 18.3 created the exact bundle in ${Math.round(migration.elapsedMs)} ms and measured ${migration.emptyBytes} bytes (${(migration.emptyBytes/1024).toFixed(0)} KiB) of initial advisory relations/indexes. Hosted PostgreSQL is 17.6.1.166. This is a local measurement, not a hosted runtime promise or same-version certification. Allow under 1 MiB initially including catalog metadata/WAL as a planning estimate, not a ceiling. Each statement stops at 3 seconds; blocked locks stop at 500 ms; any error rolls the transaction back. Apply once in a quiet monitored window, with no automated retry. Abort/review an unexpected duration over 10 seconds.

CREATE/GRANT take system-catalog and object locks; the existing Auth grant can briefly contend with Auth maintenance. No wide data read/write occurs. Five GIN indexes are empty at creation. Planned later population uses six records, one shared lease and at most 20 batches per invocation. Initial derived-index/journal reserve: 100 MiB, provisional. The 120-record local fixture is not enough to predict real description size, WAL or recurring before-images. Measure bytes after 6 and 120 real records before approving further slices. Stop if that reserve is exceeded or disk use reaches 85%; do not change source records or add storage automatically.

## Backup, execution and rollback

Supabase dashboard showed daily physical backups and a Restore action, latest 2026-10-11 01:03:26 UTC. A restore has not been rehearsed. Recheck backup freshness immediately before execution, record the recovery owner/RPO, and preserve independent evidence. Database backup does not establish Storage-object recovery. Local Toshiba completion remains unverified.

Do not run an unreviewed generic db push: local history contains only a subset of the already-applied hosted migrations. After explicit owner approval, reconcile remote history using the approved migration workflow; its dry-run must list this single exact filename and hash, with no historical replay. If it cannot, stop. Apply atomically through that workflow, capture version/hash/operator/outcome, then read back every object/ACL against this manifest. Do not use the SQL editor as a bypass.

On precommit failure the transaction must roll back entirely. On successful application followed by a concern, keep the public route disabled, revoke only newly provisioned connection memberships/credentials and retain the isolated schema for investigation. This is the default non-destructive operational rollback. An empty-schema removal requires a separately reviewed exact-object rollback and fresh confirmation that no sessions/jobs exist. Never issue a blanket production restore to undo this change. The only external grant to withdraw is the new verifier's Auth access, after disabling that connection. Existing application grants stay intact.

## Approval requested

Review and approve only this exact atomic schema/role/Auth-column-grant migration on ${manifest.projectRef}. Index population, server credential provisioning, synthetic Auth users, Vercel deployment/protection changes, paid evaluations and public activation remain separate approvals. Revalidate protected source, resource health and backup at execution time. An approval cannot override a collision, changed hash, unexpected grant or failed preflight.
`;
await writeFile(dir+'/MIGRATION_REVIEW.md',md);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const html=`<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jane · Pro integration review</title><link rel="stylesheet" href="/review-gallery.css"></head><body><a class="skip" href="#review">Skip to review</a><header><p class="eyebrow">CURTAINSUK · PRIVATE LOCAL REVIEW · 11 OCTOBER 2026</p><h1>Jane's next foundation.</h1><p class="lead">A verified Fabric Master inventory and an exact migration for our existing Supabase project. Hosted services remain inactive.</p><nav><a href="/">Try Jane's scripted consultation</a><a href="/foundations">20-scenario and human review gallery</a><a href="/evaluation">Earlier real-model conversations</a><a href="https://github.com/Nylon1/CurtainsUK/pull/169">Draft PR #169</a></nav></header><main id="review"><section class="facts"><div><strong>${identity.count.toLocaleString('en-GB')}</strong><span>Verified Master identities</span></div><div><strong>${tests.totalPassed}</strong><span>Scoped tests passed locally</span></div><div><strong>0</strong><span>Hosted descriptive records indexed</span></div></section><section class="notice"><h2>Ready for exact migration review</h2><p>Supabase Pro is verified. The new schema is private and additive, with four restricted roles and encrypted consultation records. The only existing-object access is a three-column read grant on Auth sessions.</p><p>No hosted migration, index population, deployment, customer processing or paid model call ran.</p></section><h2>Complete identity coverage. Honest knowledge coverage.</h2><p>All 16,883 IDs passed local bounded paging and integrity tests. This is an identity manifest, not complete descriptive intelligence. Five historical fabric records and 120 synthetic records remain the local indexing evidence.</p><p>The prepared population needs ${batches.toLocaleString('en-GB')} six-ID batches over at least ${coverage.minimumInvocations} invocations. Fresh resource checks stop work on load, missing telemetry or source changes. Jane cannot start indexing jobs.</p><h2>Consultation quality</h2><p>Jane's approved profile still targets 40–90 words and avoids em dashes. The 20-scenario mock suite completed 60 advice turns and three context/save/recovery actions. Fresh real-model and human design scores remain pending.</p><h2>Measured infrastructure</h2><p>The read-only identity query took 12.4 ms with zero disk blocks read or written in that measurement. The dashboard showed 6% CPU and 1% disk I/O over 24 hours. Several live charts were unavailable, so this is not clearance to index.</p><p>A daily Supabase backup is visible. Restore rehearsal and Toshiba backup completion remain unverified. Protected Vercel test deployment has not been prepared or approved.</p><h2>Review before activation</h2><ul><li>Approve the exact migration and run hosted security checks with synthetic accounts.</li><li>Review fresh telemetry and separately approve staged index population.</li><li>Revoke the old key; approve a fresh evaluation budget, proposed maximum US$5.</li><li>Complete human interior-design review, physical iPhone Safari and spoken screen-reader checks.</li></ul><details class="case"><summary>Exact migration identity</summary><div class="case-body"><p>${esc(migration.migration.migrationPath)}</p><p>SHA-256: ${esc(migration.migration.sha256)}</p><p>${tables.length} tables, ${migration.indexes.length} indexes, ${migration.functions.length} functions, four roles. Not applied.</p></div></details></main><footer>PR #167 remains the separate, approved-design Meet Our Team publication candidate. No production publication is authorised.</footer></body></html>`;
await writeFile(dir+'/review-gallery.html',html);
console.log(JSON.stringify({denominator:identity.count,batches,tables:tables.length,indexes:migration.indexes.length,functions:migration.functions.length,policies:migration.policies.length,localTests:tests.totalPassed}));
