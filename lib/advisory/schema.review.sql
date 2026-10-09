-- REVIEW DESIGN ONLY. Never applied to production. Local PostgreSQL tests only.
-- Authenticated caller is a verified Supabase JWT, not an owner supplied by UI.
-- No service-role grants, anon access, catalogue writes or existing-table edits.
create schema advisory;
revoke all on schema advisory from public;
grant usage on schema advisory to authenticated;
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
grant select, insert, update, delete on advisory.consultations to authenticated;
create policy consultation_read on advisory.consultations for select to authenticated
  using (owner_id = (select auth.uid()) and expires_at > now());
create policy consultation_create on advisory.consultations for insert to authenticated
  with check (owner_id = (select auth.uid()) and expires_at > now() and expires_at <= now() + interval '91 days');
create policy consultation_update on advisory.consultations for update to authenticated
  using (owner_id = (select auth.uid()) and expires_at > now())
  with check (owner_id = (select auth.uid()) and expires_at > now() and expires_at <= now() + interval '91 days');
create policy consultation_delete on advisory.consultations for delete to authenticated
  using (owner_id = (select auth.uid()));
-- Before cloud activation: reviewed migration via Supabase CLI, distributed
-- session lease/idempotency, authenticated recovery, expiry worker, private
-- API schema exposure decision, and encrypted backup/deletion procedures.
