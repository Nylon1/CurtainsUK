-- Staging review persistence must admit the owner-approved combined bonded layer.
alter table curtainsuk_private.staging_review_requests
  drop constraint staging_review_requests_lining_check;
alter table curtainsuk_private.staging_review_requests
  add constraint staging_review_requests_lining_check
  check (lining in ('UNLINED','STANDARD','BLACKOUT','THERMAL','BONDED'));
alter table curtainsuk_private.staging_review_requests
  add constraint staging_review_bonded_combined_layer
  check (lining <> 'BONDED' or interlining = 'NONE');
