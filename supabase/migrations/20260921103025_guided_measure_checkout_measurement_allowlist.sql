-- Guided Measure preserves customer raw hardware measurements in the immutable
-- checkout snapshot. Extend only the pre-existing measurement-key allowlist;
-- all other snapshot validation and fail-closed rules remain unchanged.
do $migration$
declare
  original text;
  definition text;
begin
  original := pg_get_functiondef('curtainsuk_private.create_staging_configuration_snapshot(jsonb)'::regprocedure);
  definition := replace(
    original,
    '''number_of_sections'', ''track_or_pole_fitted''',
    '''number_of_sections'', ''track_or_pole_fitted'',
         ''measurement_contract_version'', ''hardware'', ''raw_width_cm'',
         ''raw_drop_cm'', ''width_anchor'', ''drop_anchor'', ''desired_finish'''
  );
  if definition = original then
    raise exception 'Unexpected checkout snapshot function: Guided Measure allowlist anchor missing';
  end if;
  execute definition;
end
$migration$;
