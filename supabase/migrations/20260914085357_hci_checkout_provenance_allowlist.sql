-- Extend only the existing immutable summary allowlist; preserve all commerce gates.
do $migration$
declare definition text; original text;
begin
 original:=replace(pg_get_functiondef('curtainsuk_private.create_staging_configuration_snapshot(jsonb)'::regprocedure),E'\r\n',E'\n');
 definition:=replace(original,E'''deliveryShownSeparately''\n       )',E'''deliveryShownSeparately'', ''patternAllowance'', ''consultationContext''\n       )');
 if definition=original then raise exception 'Unexpected checkout function: allowlist anchor missing'; end if;
 definition:=replace(definition,E'begin\n  if outcome',$guard$begin
  if p_snapshot->'customer_summary' ? 'patternAllowance' then
    if jsonb_typeof(p_snapshot#>'{customer_summary,patternAllowance}') is distinct from 'object'
      or not coalesce((p_snapshot#>'{customer_summary,patternAllowance}') in (
        '{"provenance":"DEFAULT_PATTERN_ALLOWANCE","allowanceMm":500,"policyVersion":"curtainsuk-pattern-allowance-v1"}'::jsonb,
        '{"provenance":"PLAIN_NO_MATCH_REQUIRED","allowanceMm":0,"policyVersion":"curtainsuk-pattern-allowance-v1"}'::jsonb
      ),false) then raise exception 'Invalid checkout pattern provenance'; end if;
  end if;
  if p_snapshot->'customer_summary' ? 'consultationContext' then
    if jsonb_typeof(p_snapshot#>'{customer_summary,consultationContext}') is distinct from 'object' then raise exception 'Invalid checkout consultation provenance'; end if;
    if not (p_snapshot#>'{customer_summary,consultationContext}') ?& array['sessionId','strategyId','fabricMasterId','policyVersion','recommendationVersion']
      or exists(select 1 from jsonb_each(p_snapshot#>'{customer_summary,consultationContext}') e where e.key not in ('sessionId','strategyId','fabricMasterId','policyVersion','recommendationVersion') or jsonb_typeof(e.value)<>'string')
      or p_snapshot#>>'{customer_summary,consultationContext,fabricMasterId}' is distinct from p_snapshot->>'fabric_master_id'
      or not coalesce(p_snapshot#>>'{customer_summary,consultationContext,sessionId}' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',false)
      or not coalesce(p_snapshot#>>'{customer_summary,consultationContext,strategyId}' in ('overall','tonal','complementary','pattern-style','bold'),false)
      or not coalesce(p_snapshot#>>'{customer_summary,consultationContext,policyVersion}' ~ '^[a-zA-Z0-9._-]{1,100}$',false)
      or not coalesce(p_snapshot#>>'{customer_summary,consultationContext,recommendationVersion}' ~ '^sha256:[0-9a-f]{64}$',false)
      or not exists(select 1 from curtainsuk_private.hci_staging_versions v where v.session_id::text=p_snapshot#>>'{customer_summary,consultationContext,sessionId}')
      then raise exception 'Invalid checkout consultation provenance'; end if;
  end if;
  if outcome$guard$);
 if definition=original or position('Invalid checkout pattern provenance' in definition)=0 then raise exception 'Unexpected checkout function: validation anchor missing'; end if;
 execute definition;
end $migration$;
