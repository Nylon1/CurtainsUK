-- Prevent the per-minute Browse projection rebuild from contending with
-- authoritative supplier stock batch approval.
--
-- Supplier stock writes mark Browse globally dirty. During a bulk SDG/PT
-- refresh that can cause the cron-driven Browse rebuild to start mid-batch and
-- hold the shared advisory lock for a long full projection refresh. Stock
-- approval then waits behind Browse and can hit its bounded API/database
-- timeout.
--
-- Recent 100-SKU supplier batch audit rows are a reliable, self-expiring
-- activity signal. While batches are actively flowing, Browse skips that cron
-- pass and retries later. No persistent pause flag is required, so a crashed
-- supplier workflow cannot leave Browse disabled.

create or replace function curtainsuk_private.browse_projection_refresh_dirty(p_limit integer default 500)
returns jsonb
language plpgsql
set search_path to ''
set enable_nestloop to 'off'
as $function$
declare
  generation uuid;
  ids text[];
  result_metadata jsonb;
  knowledge_cache_stamp timestamptz;
begin
  if exists (
    select 1
    from curtainsuk_private.supplier_sync_runs r
    where r.adapter_id in ('sdg-portal-product-detail','pt-webtex-stock-enquiry')
      and r.created_at >= clock_timestamp() - interval '3 minutes'
  ) then
    return jsonb_build_object('skipped','supplier_stock_active');
  end if;

  perform pg_advisory_xact_lock(4252026, 9248);

  select max(refreshed_at) into knowledge_cache_stamp
    from curtainsuk_private.fabric_visual_knowledge_read_cache;
  select active_generation into generation
    from curtainsuk_private.browse_projection_control where singleton for update;

  if generation is null
    or exists (select 1 from curtainsuk_private.browse_projection_control
      where singleton and knowledge_cache_dirty)
    or exists (select 1 from curtainsuk_private.browse_projection_control
      where singleton and knowledge_cache_refreshed_at is distinct from knowledge_cache_stamp)
    or exists (select 1 from curtainsuk_private.browse_projection_dirty where fabric_id = '*')
    or exists (select 1 from curtainsuk_private.browse_projection_control
      where singleton and now() >= next_time_change_at)
  then
    return curtainsuk_private.browse_projection_refresh_full();
  end if;

  select array_agg(fabric_id) into ids from (
    select fabric_id from curtainsuk_private.browse_projection_dirty
    order by changed_at, fabric_id
    limit greatest(1, least(p_limit, 5000))
  ) queued;

  if ids is null then
    return jsonb_build_object('generation',generation,'refreshed',0);
  end if;

  delete from curtainsuk_private.browse_read_projection
    where generation_id = generation and fabric_id = any(ids);

  insert into curtainsuk_private.browse_read_projection
    select generation, e.*
    from curtainsuk_private.browse_eligible_set_v1 e
    where e.fabric_id = any(ids);

  select curtainsuk_private.browse_projection_metadata(generation)
    into result_metadata;

  update curtainsuk_private.browse_projection_control
    set refreshed_at = now(),
        next_time_change_at = curtainsuk_private.browse_projection_next_time_change(),
        metadata = result_metadata
    where singleton;

  delete from curtainsuk_private.browse_projection_dirty
    where fabric_id = any(ids);

  return jsonb_build_object('generation',generation,'refreshed',cardinality(ids));
end;
$function$;
