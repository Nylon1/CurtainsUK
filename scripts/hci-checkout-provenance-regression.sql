-- Run against staging only. All inserted fixtures roll back.
begin;
do $$
declare p jsonb; c jsonb; result jsonb; bad jsonb; rejected boolean;
begin
 select to_jsonb(s) into strict p from curtainsuk_private.staging_configuration_snapshots s where pricing_outcome='INSTANT_PRICE' limit 1;
 p:=p||jsonb_build_object('snapshot_id',gen_random_uuid(),'configuration_id',gen_random_uuid(),'fabric_master_id','pt-4262-770','supplier_sku','4262/770');
 c:=(p->'customer_summary')||jsonb_build_object('fabric',jsonb_build_object('id','pt-4262-770','design','Sadira','colour','Lagoon'),
 'patternAllowance',jsonb_build_object('provenance','DEFAULT_PATTERN_ALLOWANCE','allowanceMm',500,'policyVersion','curtainsuk-pattern-allowance-v1'),
 'consultationContext',jsonb_build_object('sessionId','d8052224-4554-428c-9873-c94fefc665d4','strategyId','overall','fabricMasterId','pt-4262-770','policyVersion','41a9f3f','recommendationVersion','sha256:1bfd7839c767ff5389ccf9b64c0c313a7271a5b8d228053f54c603a69e8b68f0'));
 p:=jsonb_set(p,'{customer_summary}',c);
 result:=curtainsuk_private.create_staging_configuration_snapshot(p);
 if result->>'snapshot_id' is distinct from p->>'snapshot_id' then raise exception 'Valid provenance was not persisted'; end if;
 if (select customer_summary from curtainsuk_private.staging_configuration_snapshots where snapshot_id=(p->>'snapshot_id')::uuid) is distinct from c then raise exception 'Provenance changed'; end if;
 perform curtainsuk_private.create_staging_configuration_snapshot(jsonb_set(p||jsonb_build_object('snapshot_id',gen_random_uuid(),'configuration_id',gen_random_uuid()),'{customer_summary,consultationContext,recommendationVersion}','"initial:d8052224-4554-428c-9873-c94fefc665d4"'));
 for bad in select value from jsonb_array_elements(jsonb_build_array(
   jsonb_set(c,'{patternAllowance,allowanceMm}','499'),
   jsonb_set(c,'{patternAllowance,supplier_cost}','100'),
   jsonb_set(c,'{consultationContext,fabricMasterId}','"wrong-fabric"'),
   jsonb_set(c,'{consultationContext,credentials}','"forbidden"'),
   jsonb_set(c,'{consultationContext,sessionId}','"not-a-session"')
 )) loop
   rejected:=false;
   begin
     perform curtainsuk_private.create_staging_configuration_snapshot(jsonb_set(p||jsonb_build_object('snapshot_id',gen_random_uuid(),'configuration_id',gen_random_uuid()),'{customer_summary}',bad));
   exception when others then rejected:=true; end;
   if not rejected then raise exception 'Invalid provenance accepted'; end if;
 end loop;
end $$;
rollback;
