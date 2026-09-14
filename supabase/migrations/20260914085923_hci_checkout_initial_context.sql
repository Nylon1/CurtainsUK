-- Preserve the existing pre-refinement HCI handoff contract as well as refined digests.
do $$
declare definition text; original text;
begin
 original:=pg_get_functiondef('curtainsuk_private.create_staging_configuration_snapshot(jsonb)'::regprocedure);
 definition:=replace(original,
   $old$or not coalesce(p_snapshot#>>'{customer_summary,consultationContext,recommendationVersion}' ~ '^sha256:[0-9a-f]{64}$',false)$old$,
   $new$or not coalesce((p_snapshot#>>'{customer_summary,consultationContext,recommendationVersion}' ~ '^sha256:[0-9a-f]{64}$') or (p_snapshot#>>'{customer_summary,consultationContext,recommendationVersion}' = 'initial:' || (p_snapshot#>>'{customer_summary,consultationContext,sessionId}')),false)$new$);
 if definition=original then raise exception 'Initial HCI context validation anchor missing'; end if;
 execute definition;
end $$;
