param(
  [ValidateSet('parity', 'parity-hash', 'candidate-plan', 'candidate-plan-hash', 'projection-rehearsal')]
  [string]$Mode = 'parity'
)

$ErrorActionPreference = 'Stop'
$projectRef = 'hqysjumypgeapgmqkcrx'
$migrationDir = Join-Path $PSScriptRoot '..\supabase\migrations'
$candidateDir = Join-Path $PSScriptRoot '..\sql-candidates\browse'
$oldText = Get-Content -LiteralPath (Join-Path $migrationDir '20260924090000_browse_manufacturer_colour_facet.sql') -Raw
$newText = Get-Content -LiteralPath (Join-Path $candidateDir '20260925064738_browse_set_oriented_search.sql') -Raw

$oldMatch = [regex]::Match($oldText, '(?s)\), eligible AS \((.*?)\), matched AS \(')
$guideMatch = [regex]::Match($newText, '(?s)CREATE VIEW curtainsuk_private\.browse_current_guide_prices_set_v1.*?\bAS\s+(WITH latest_promotion.*?);\s*REVOKE')
$newMatch = [regex]::Match($newText, '(?s)CREATE VIEW curtainsuk_private\.browse_eligible_set_v1.*?\bAS\s+(WITH approved_guides.*?);\s*REVOKE')
if (-not $oldMatch.Success -or -not $guideMatch.Success -or -not $newMatch.Success) {
  throw 'Could not extract the old and set-oriented Browse SQL.'
}

$oldSelect = $oldMatch.Groups[1].Value
$newSelect = $newMatch.Groups[1].Value.Replace(
  'FROM curtainsuk_private.browse_current_guide_prices_set_v1',
  "FROM ($($guideMatch.Groups[1].Value)) guide_projection"
)
if ($Mode -eq 'projection-rehearsal') {
  $sql = @"
BEGIN;
SET LOCAL enable_nestloop = off;
CREATE TEMP TABLE browse_projection_rehearsal ON COMMIT DROP AS $newSelect;
CREATE UNIQUE INDEX browse_projection_rehearsal_id ON browse_projection_rehearsal(fabric_id);
CREATE INDEX browse_projection_rehearsal_sort ON browse_projection_rehearsal(brand, design, colour_name, fabric_id);
ANALYZE browse_projection_rehearsal;
CREATE TEMP TABLE browse_rehearsal_times(label text, elapsed_ms numeric) ON COMMIT DROP;
DO `$bench`$
DECLARE started timestamptz; i integer;
BEGIN
  FOR i IN 1..20 LOOP
    started := clock_timestamp();
    PERFORM fabric_id FROM browse_projection_rehearsal
      ORDER BY brand, design, colour_name, fabric_id LIMIT 24;
    INSERT INTO browse_rehearsal_times VALUES ('default', extract(epoch FROM clock_timestamp() - started) * 1000);
    started := clock_timestamp();
    PERFORM fabric_id FROM browse_projection_rehearsal
      ORDER BY brand, design, colour_name, fabric_id LIMIT 24 OFFSET 24;
    INSERT INTO browse_rehearsal_times VALUES ('page_2', extract(epoch FROM clock_timestamp() - started) * 1000);
    started := clock_timestamp();
    PERFORM count(*) FROM browse_projection_rehearsal
      WHERE guide_minor >= 5000 AND guide_minor < 10000
        AND ('blue' = ANY(manufacturer_colour_families)
          OR visual_primary_colour = 'blue' OR visual_secondary_colours ? 'blue')
        AND ('geometric' = pattern_class OR motif ? 'geometric');
    INSERT INTO browse_rehearsal_times VALUES ('blue_geometric_price', extract(epoch FROM clock_timestamp() - started) * 1000);
  END LOOP;
END
`$bench`$;
SELECT label, count(*) AS runs, round(min(elapsed_ms), 3) AS minimum_ms,
  round(avg(elapsed_ms), 3) AS average_ms, round(max(elapsed_ms), 3) AS maximum_ms
FROM browse_rehearsal_times GROUP BY label ORDER BY label;
ROLLBACK;
"@
} elseif ($Mode -eq 'candidate-plan' -or $Mode -eq 'candidate-plan-hash') {
  $sql = "EXPLAIN (ANALYZE, BUFFERS) SELECT count(*) FROM ($newSelect) candidate"
  if ($Mode -eq 'candidate-plan-hash') {
    $sql = "BEGIN; SET LOCAL enable_nestloop = off; $sql; ROLLBACK;"
  }
} else {
  $sql = @"
WITH approved_guides AS MATERIALIZED (
  SELECT * FROM curtainsuk_private.current_retail_guide_prices()
), old_rows AS MATERIALIZED (
$oldSelect
), new_rows AS MATERIALIZED (
$newSelect
)
SELECT
  (SELECT count(*) FROM old_rows) AS old_count,
  (SELECT count(*) FROM new_rows) AS new_count,
  (SELECT count(*) FROM (SELECT fabric_id FROM old_rows EXCEPT SELECT fabric_id FROM new_rows) x) AS old_only,
  (SELECT count(*) FROM (SELECT fabric_id FROM new_rows EXCEPT SELECT fabric_id FROM old_rows) x) AS new_only,
  (SELECT count(*) FROM old_rows o JOIN new_rows n USING (fabric_id)
    WHERE to_jsonb(o) <> to_jsonb(n)) AS differing_rows;
"@
  if ($Mode -eq 'parity-hash') {
    $sql = "BEGIN; SET LOCAL enable_nestloop = off; $sql; ROLLBACK;"
  }
}

# The SQL is generated mechanically from checked-in source. The temporary file is
# deleted in finally; no migration or schema change is submitted to production.
$queryFile = [System.IO.Path]::GetTempFileName()
try {
  [System.IO.File]::WriteAllText($queryFile, $sql)
  & npx --yes supabase db query --linked --project-ref $projectRef --file $queryFile
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Remove-Item -LiteralPath $queryFile -Force -ErrorAction SilentlyContinue
}
