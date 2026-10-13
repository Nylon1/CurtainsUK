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
  return query with q as (select websearch_to_tsquery('english',p_query) as q0,websearch_to_tsquery('english',p_colour) as q1,websearch_to_tsquery('english',p_pattern) as q2,websearch_to_tsquery('english',p_texture) as q3,websearch_to_tsquery('english',p_composition) as q4)
select k.fabric_id from advisory.knowledge_search k cross join q
where (querytree(q.q0) not in ('','T')) and (p_colour='' or (querytree(q.q1) not in ('','T'))) and (p_pattern='' or (querytree(q.q2) not in ('','T'))) and (p_texture='' or (querytree(q.q3) not in ('','T'))) and (p_composition='' or (querytree(q.q4) not in ('','T'))) and k.document @@ q.q0 and (p_colour='' or k.colour @@ q.q1) and (p_pattern='' or k.pattern @@ q.q2) and (p_texture='' or k.texture @@ q.q3) and (p_composition='' or k.composition @@ q.q4)
order by (ts_rank_cd(k.document,q.q0,32)*1+ts_rank_cd(k.colour,q.q0,32)*2+ts_rank_cd(k.pattern,q.q0,32)*2+ts_rank_cd(k.texture,q.q0,32)*2+ts_rank_cd(k.composition,q.q0,32)*2+ts_rank_cd(k.colour,q.q1,32)*2+ts_rank_cd(k.pattern,q.q2,32)*2+ts_rank_cd(k.texture,q.q3,32)*2+ts_rank_cd(k.composition,q.q4,32)*2) desc,k.fabric_id limit 6;
end $$;
commit;
