CREATE OR REPLACE FUNCTION curtainsuk_private.fabric_visual_knowledge_payload()
RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('fabric_id',fabric_id,'knowledge_state',knowledge_state,'visual_fields',visual_fields) ORDER BY fabric_id),'[]'::jsonb)
  FROM curtainsuk_private.fabric_visual_knowledge WHERE knowledge_state IN ('COMPLETE','PARTIAL_GOVERNED');
$$;
REVOKE ALL ON FUNCTION curtainsuk_private.fabric_visual_knowledge_payload() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION curtainsuk_private.fabric_visual_knowledge_payload() TO service_role;