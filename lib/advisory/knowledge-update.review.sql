-- REVIEW / LOCAL TEST ONLY. No source triggers, scheduler or hosted migration.
-- Requires the existing advisory schema, index_gate and advisory_indexer role.
-- These are identity/evidence checkpoints, never a second product catalogue.
create table advisory.knowledge_update_jobs (
 id uuid primary key,
 manifest_hash text not null unique check(manifest_hash ~ '^[a-f0-9]{64}$'),
 manifest jsonb not null check(octet_length(manifest::text)<=131072),
 population_job uuid not null references advisory.index_jobs(id),
 cursor integer not null default 0 check(cursor between 0 and 120),
 expected integer not null check(expected between 0 and 120),
 complete boolean not null default false,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 check(cursor<=expected),check(not complete or cursor=expected)
);
create table advisory.knowledge_update_receipts (
 job_id uuid not null references advisory.knowledge_update_jobs(id),
 fabric_id text not null check(fabric_id ~ '^[A-Za-z0-9][A-Za-z0-9-]{0,149}$'),
 before_row jsonb,after_hash text check(after_hash is null or after_hash ~ '^[a-f0-9]{64}$'),
 source_revision text not null check(source_revision ~ '^[a-f0-9]{64}$'),
 outcome text not null check(outcome in ('insert','update','unchanged','withdrawn','absent')),
 observed_at timestamptz not null,committed_at timestamptz not null default clock_timestamp(),
 primary key(job_id,fabric_id)
);
alter table advisory.knowledge_update_jobs enable row level security;
alter table advisory.knowledge_update_jobs force row level security;
alter table advisory.knowledge_update_receipts enable row level security;
alter table advisory.knowledge_update_receipts force row level security;
revoke all on advisory.knowledge_update_jobs,advisory.knowledge_update_receipts from public,anon,authenticated,service_role;
grant select,insert,update on advisory.knowledge_update_jobs to advisory_indexer;
grant select,insert on advisory.knowledge_update_receipts to advisory_indexer;
create policy knowledge_update_jobs_operator on advisory.knowledge_update_jobs to advisory_indexer using(true) with check(true);
create policy knowledge_update_receipts_operator on advisory.knowledge_update_receipts to advisory_indexer using(true) with check(true);
