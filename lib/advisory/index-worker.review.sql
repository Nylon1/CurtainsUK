-- Isolated test/review DDL only; never executed against production.
create table advisory.index_jobs (
 id uuid primary key, source_snapshot text not null check(length(source_snapshot) between 1 and 256), expected_count integer check(expected_count>=0),
 cursor jsonb check(octet_length(cursor::text)<=2048), processed integer not null default 0, indexed integer not null default 0,
 complete boolean not null default false, batches integer not null default 0,
 status text not null default 'ready' check(status in ('ready','exhausted','rolling_back','rolled_back')),
 failures integer not null default 0, last_error text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table advisory.index_jobs enable row level security;
revoke all on advisory.index_jobs from public,anon,authenticated;
grant select,insert,update on advisory.index_jobs to service_role;
-- Per-job identity receipts prevent duplicate pages inflating coverage counts.
create table advisory.index_job_items (
 job_id uuid not null references advisory.index_jobs(id) on delete cascade,
 fabric_id text not null, before_row jsonb, after_hash text not null,
 fields jsonb not null default '{}', rolled_back boolean not null default false,
 write_sequence bigint generated always as identity,
 primary key(job_id,fabric_id)
);
alter table advisory.index_job_items enable row level security;
revoke all on advisory.index_job_items from public,anon,authenticated;
grant select,insert,update on advisory.index_job_items to service_role;
-- One I/O gate across every indexing job. No network inside transactions.
create table advisory.index_gate (
 id integer primary key check(id=1), token uuid, lease_until timestamptz,
 next_at timestamptz not null default '-infinity'
);
insert into advisory.index_gate(id) values(1);
alter table advisory.index_gate enable row level security;
revoke all on advisory.index_gate from public,anon,authenticated;
grant select,update on advisory.index_gate to service_role;
