-- Preserve single-use sample credit when it accompanies the server-priced
-- WELCOME5 discount. The previously supported personal 10% path is unchanged.
create or replace function curtainsuk_private.reserve_sample_credit(p_quote jsonb,p_contract jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare g curtainsuk_private.sample_credit_grants; r curtainsuk_private.sample_credit_redemptions;
  ids uuid[]; n integer:=0; qid text:=p_quote->>'reservationId';
  promo_minor integer:=coalesce((p_contract->'promotionQuote'->>'amountMinor')::integer,0);
  welcome_count integer;
begin
  select count(*) into welcome_count from jsonb_array_elements(p_contract->'input'->'customAttributes') a
    where a->>'key'='curtainsuk_welcome_code' and a->>'value'='WELCOME5';
  if welcome_count>0 then
    if welcome_count<>1 or p_contract ? 'promotionQuote' or (p_contract->'expected'->>'goodsGrossAmountMinor')::integer<=0
      then raise exception 'SAMPLE_CREDIT_INVALID'; end if;
    promo_minor:=round((p_contract->'expected'->>'goodsGrossAmountMinor')::numeric*0.05)::integer;
  end if;
  select array_agg((x->>'id')::uuid order by x->>'id') into ids from jsonb_array_elements(p_quote->'grants') x;
  if ids is null or cardinality(ids)>10 or (p_quote->>'sampleCount')::int not between 1 and 10 then raise exception 'SAMPLE_CREDIT_INVALID'; end if;
  for g in select * from curtainsuk_private.sample_credit_grants where id=any(ids) order by id for update loop
    n:=n+1;
    if g.state not in ('AVAILABLE','RESERVED') or (g.reservation_id is not null and g.reservation_id<>qid) then raise exception 'SAMPLE_CREDIT_UNAVAILABLE'; end if;
  end loop;
  if n<>cardinality(ids) or n<>(select count(distinct x) from unnest(ids) x) then raise exception 'SAMPLE_CREDIT_INVALID'; end if;
  select * into r from curtainsuk_private.sample_credit_redemptions where id=qid for update;
  if found then
    if r.state<>'RESERVED' or r.digest<>p_quote->>'digest' or r.grant_ids<>ids or r.contract<>p_contract or r.amount_minor<>(p_quote->>'amountMinor')::int then raise exception 'SAMPLE_CREDIT_CONFLICT'; end if;
    return;
  end if;
  if not exists(select 1 from jsonb_array_elements(p_contract->'input'->'customAttributes') a where a->>'key'='curtainsuk_sample_credit_id' and a->>'value'=qid)
    or (p_contract->'expected'->>'discountAmountMinor')::int<>(p_quote->>'amountMinor')::int+promo_minor then raise exception 'SAMPLE_CREDIT_INVALID'; end if;
  insert into curtainsuk_private.sample_credit_redemptions(id,digest,grant_ids,sample_count,amount_minor,contract)
    values(qid,p_quote->>'digest',ids,(p_quote->>'sampleCount')::int,(p_quote->>'amountMinor')::int,p_contract);
  update curtainsuk_private.sample_credit_grants set state='RESERVED',reservation_id=qid,updated_at=now() where id=any(ids);
end $$;

revoke all on function curtainsuk_private.reserve_sample_credit(jsonb,jsonb) from public,anon,authenticated;
grant execute on function curtainsuk_private.reserve_sample_credit(jsonb,jsonb) to service_role;
