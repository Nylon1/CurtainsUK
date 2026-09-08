-- One attempt per immutable staging handoff, including ambiguous remote outcomes.
-- No expiry: a missing Shopify search result is not evidence that creation failed.
create table curtainsuk_private.staging_draft_creation_claims (
  handoff_id uuid primary key references curtainsuk_private.staging_checkout_handoffs(handoff_id),
  claimed_at timestamptz not null default now()
);
alter table curtainsuk_private.staging_draft_creation_claims enable row level security;
revoke all on curtainsuk_private.staging_draft_creation_claims from public, anon, authenticated, service_role;
grant select, insert on curtainsuk_private.staging_draft_creation_claims to service_role;
create trigger staging_draft_creation_claims_append_only
before update or delete on curtainsuk_private.staging_draft_creation_claims
for each row execute function curtainsuk_private.reject_curtainsuk_immutable_mutation();
comment on table curtainsuk_private.staging_draft_creation_claims is
'One-shot staging Shopify create claim. Never reset after an uncertain response. Reconcile using saved receipt or exact handoff tag; unresolved claims require operator investigation.';
