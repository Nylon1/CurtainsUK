# Already-applied production definition: 20260927225121

> **Historical reference only. Already applied in production. Do not execute, source, feed to a migration runner, or move this file into supabase/migrations/.** This document is not a pending migration.

- Applied ledger: Supabase project hqysjumypgeapgmqkcrx, supabase_migrations.schema_migrations.
- Applied version: 20260927225121.
- Applied name: naila_prepared_price_level_ids.
- Recorded source: statements[1] from the applied ledger, read-only capture on 2026-09-29.
- Protected source compared: Nylon1/CurtainsUK release/production at 4bcfc8bd13838372a3547af9b58e8cbe3bcd39d1.
- Object: curtainsuk_private.retail_guide_price_level_fabric_ids_naila_prepared_v1(integer,integer).
- Original recorded statement length: 1496 characters; MD5 of original recorded text: 8ead0f94f5651fd41026c8fd3732ceeb.
- Reference text below: CRLF converted to LF only; 1496 UTF-8 bytes; SHA-256: 29041a0d7a0594675a1ad258dacb82a0ae3a5f9d2494b26ac4efacb91d564874.
- Earlier read-only live definition evidence: pg_get_functiondef showed the recorded dollar-quoted function body after line-ending normalization; service-role EXECUTE was present. SHA-256 of the captured pg_get_* text after LF normalization: c1d99c12f0f7be420804bb17ca070ace421ce9441b2975a67509e4529c09c02a.

The SQL below is retained for source reconstruction and review. It has not been added to the active migration directory. The captured live-definition digest records introspection evidence; it is not a claim that PostgreSQL deparsed text is byte-identical to the recorded statement.

## Recorded applied SQL — do not run

```sql
CREATE FUNCTION curtainsuk_private.retail_guide_price_level_fabric_ids_naila_prepared_v1(p_guide_min integer,p_guide_max integer) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path TO '' AS $function$ DECLARE active_generation uuid; next_change timestamptz; knowledge_dirty boolean; BEGIN SELECT c.active_generation,c.next_time_change_at,c.knowledge_cache_dirty INTO active_generation,next_change,knowledge_dirty FROM curtainsuk_private.browse_projection_control c WHERE c.singleton; IF active_generation IS NULL OR next_change IS NULL OR knowledge_dirty IS DISTINCT FROM false OR now() >= next_change OR EXISTS (SELECT 1 FROM curtainsuk_private.browse_projection_dirty LIMIT 1) OR NOT EXISTS (SELECT 1 FROM curtainsuk_private.browse_read_projection p WHERE p.generation_id=active_generation LIMIT 1) THEN RAISE EXCEPTION 'NAILA_PREPARED_PRICE_UNAVAILABLE' USING ERRCODE='55000'; END IF; RETURN (SELECT coalesce(jsonb_agg(p.fabric_id::text ORDER BY p.fabric_id),'[]'::jsonb) FROM curtainsuk_private.browse_read_projection p WHERE p.generation_id=active_generation AND p.guide_minor>=p_guide_min AND (p_guide_max IS NULL OR p.guide_minor<p_guide_max)); END; $function$; REVOKE ALL ON FUNCTION curtainsuk_private.retail_guide_price_level_fabric_ids_naila_prepared_v1(integer,integer) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION curtainsuk_private.retail_guide_price_level_fabric_ids_naila_prepared_v1(integer,integer) TO service_role; NOTIFY pgrst,'reload schema';
```
