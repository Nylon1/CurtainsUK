-- REVIEW ONLY: not applied. Existing function ACL, signature and invoker mode preserved.
begin;
set local lock_timeout='500ms';
set local statement_timeout='3s';
create or replace function advisory.search_knowledge(p_query text,p_colour text,p_pattern text,p_texture text,p_composition text)
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
commit;
