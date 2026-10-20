-- Expand only the existing private, consented diagnostic object. The API
-- still validates every field before it reaches this table.
alter table curtainsuk_private.customer_journey_events
  drop constraint customer_journey_error_detail_bounded;

alter table curtainsuk_private.customer_journey_events
  add constraint customer_journey_error_detail_bounded check (
    error_detail is null or (
      kind = 'ERROR'
      and jsonb_typeof(error_detail) = 'object'
      and length(error_detail::text) <= 2048
    )
  );

alter table curtainsuk_private.customer_operational_errors
  add column diagnostic jsonb;

alter table curtainsuk_private.customer_operational_errors
  add constraint customer_operational_diagnostic_bounded check (
    diagnostic is null or (
      jsonb_typeof(diagnostic) = 'object'
      and length(diagnostic::text) <= 512
    )
  );
