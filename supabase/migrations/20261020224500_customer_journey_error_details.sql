-- Keep technical browser diagnostics bounded and private. The API accepts only
-- fixed message codes, known error types, safe script basenames and positions.
alter table curtainsuk_private.customer_journey_events
  add column error_detail jsonb;

alter table curtainsuk_private.customer_journey_events
  add constraint customer_journey_error_detail_bounded check (
    error_detail is null or (
      kind = 'ERROR'
      and jsonb_typeof(error_detail) = 'object'
      and length(error_detail::text) <= 512
    )
  );
