-- REVIEW ONLY. Explicit additional read grant, separate from advisory storage.
-- Validate these existing Auth columns before migration approval. Never writes
-- to Auth, changes its policies, creates customers or exposes Auth to browsers.
create role advisory_auth_verifier nologin noinherit;
grant usage on schema auth to advisory_auth_verifier;
grant select(id,user_id,not_after) on auth.sessions to advisory_auth_verifier;
-- Rollback only these new privileges/role after disabling its server credential.
-- Do not revoke any pre-existing application's Auth access.
