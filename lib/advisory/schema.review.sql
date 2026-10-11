-- REVIEW DESIGN ONLY. Never applied to production. Local PostgreSQL tests only.
-- Authenticated caller is a verified Supabase JWT, not an owner supplied by UI.
-- No service-role grants, anon access, catalogue writes or existing-table edits.
create schema advisory;
revoke all on schema advisory from public;
create table advisory.consultations (
  id uuid primary key,
  owner_id uuid not null,
  revision integer not null check (revision >= 0),
  state jsonb not null check ((
    jsonb_typeof(state) = 'object' and octet_length(state::text) <= 400000
    and state ?& array['id','owner','revision','saved','expiresAt']
    and state->>'id' = id::text and state->>'owner' = owner_id::text
    and (state->>'revision')::integer = revision and state->'saved' = 'true'::jsonb
  ) is true),
  consent_version text not null check (consent_version = 'advisory-preview-v1'),
  expires_at timestamptz not null check ((expires_at = to_timestamp((state->>'expiresAt')::double precision / 1000)) is true),
  created_at timestamptz not null default now()
);
create index advisory_consultations_owner_expiry on advisory.consultations(owner_id, expires_at);
alter table advisory.consultations enable row level security;
alter table advisory.consultations force row level security;
revoke all on advisory.consultations from public;
-- No browser role receives access. The complete atomic bundle installs private
-- runtime RLS using an owner verified server-side through the official Auth API.
-- Before cloud activation: reviewed migration via Supabase CLI, distributed
-- session lease/idempotency, authenticated recovery, expiry worker, private
-- API schema exposure decision, and encrypted backup/deletion procedures.
