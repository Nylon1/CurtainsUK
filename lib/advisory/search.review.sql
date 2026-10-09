-- LOCAL REVIEW ONLY. Small derived index, not a duplicate product catalogue.
-- No production DDL, refresh triggers, bulk backfill or supplier changes run.
create table advisory.knowledge_search (
  fabric_id text primary key check(fabric_id ~ '^[A-Za-z0-9][A-Za-z0-9-]{0,149}$'),
  document tsvector not null,
  colour tsvector not null, pattern tsvector not null,
  texture tsvector not null, composition tsvector not null,
  source_hash text not null, indexed_at timestamptz not null default now()
);
create index advisory_knowledge_terms on advisory.knowledge_search using gin(document);
create index advisory_knowledge_colour on advisory.knowledge_search using gin(colour);
create index advisory_knowledge_pattern on advisory.knowledge_search using gin(pattern);
create index advisory_knowledge_texture on advisory.knowledge_search using gin(texture);
create index advisory_knowledge_composition on advisory.knowledge_search using gin(composition);
alter table advisory.knowledge_search enable row level security;
revoke all on advisory.knowledge_search from public,anon,authenticated;
grant select,insert,update,delete on advisory.knowledge_search to service_role;
-- No raw descriptions/images/prices/costs/eligibility stored in this index.
-- Retrieved identities must be rehydrated and retail eligibility revalidated.
create function advisory.search_knowledge(p_query text,p_colour text,p_pattern text,p_texture text,p_composition text)
returns table(fabric_id text) language plpgsql stable security invoker
set search_path='' set statement_timeout='2s' as $$
begin
  if p_query is null or length(trim(p_query))<2 or length(p_query)>100
    or p_colour is null or length(p_colour)>50 or p_pattern is null or length(p_pattern)>50
    or p_texture is null or length(p_texture)>50 or p_composition is null or length(p_composition)>50 then raise exception 'INVALID_INPUT'; end if;
  return query select k.fabric_id from advisory.knowledge_search k
    where k.document @@ websearch_to_tsquery('english',p_query)
      and (p_colour='' or k.colour @@ websearch_to_tsquery('english',p_colour))
      and (p_pattern='' or k.pattern @@ websearch_to_tsquery('english',p_pattern))
      and (p_texture='' or k.texture @@ websearch_to_tsquery('english',p_texture))
      and (p_composition='' or k.composition @@ websearch_to_tsquery('english',p_composition))
    order by k.fabric_id limit 6;
end $$;
revoke all on function advisory.search_knowledge(text,text,text,text,text) from public,anon,authenticated;
grant execute on function advisory.search_knowledge(text,text,text,text,text) to service_role;
