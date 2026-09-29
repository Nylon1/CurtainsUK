-- Restore the already-approved Guided Measure keys lost from the live function.
-- The exact-current guard prevents this repair from rewriting a changed function.
do $migration$
declare
  original text;
  definition text;
begin
  original := pg_get_functiondef('curtainsuk_private.create_staging_configuration_snapshot(jsonb)'::regprocedure);
  if md5(original) <> 'a67cb5f3b2d393e439674282f3c83717' then
    raise exception 'Unexpected checkout snapshot function: current definition changed';
  end if;

  definition := replace(
    original,
    '''number_of_sections'', ''track_or_pole_fitted''',
    '''number_of_sections'', ''track_or_pole_fitted'',
         ''measurement_contract_version'', ''hardware'', ''raw_width_cm'',
         ''raw_drop_cm'', ''width_anchor'', ''drop_anchor'', ''desired_finish'''
  );
  if definition = original or md5(definition) <> 'ec722311cb3a5c03ab6b995c26df45aa' then
    raise exception 'Unexpected checkout snapshot function: Guided Measure allowlist transformation failed';
  end if;

  execute definition;
end
$migration$;
