-- Isolated test/review DDL only; never executed against production.
create table advisory.index_jobs (
 id uuid primary key, source_snapshot text not null, expected_count integer check(expected_count>=0),
 cursor jsonb, processed integer not null default 0, indexed integer not null default 0,
 complete boolean not null default false, batches integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table advisory.index_jobs enable row level security;
revoke all on advisory.index_jobs from public,anon,authenticated;
grant select,insert,update on advisory.index_jobs to service_role;
-- Per-job identity receipts prevent duplicate pages inflating coverage counts.
create table advisory.index_job_items (
 job_id uuid not null references advisory.index_jobs(id) on delete cascade,
 fabric_id text not null, primary key(job_id,fabric_id)
);
alter table advisory.index_job_items enable row level security;
revoke all on advisory.index_job_items from public,anon,authenticated;
grant select,insert on advisory.index_job_items to service_role;
