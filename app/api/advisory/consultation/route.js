import { deploymentGate } from '../../../../lib/advisory/http.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request){
  const blocked=deploymentGate(request,process.env);if(blocked)return blocked;
  // Deliberately fail closed until a reviewed authenticated Supabase store,
  // distributed lease/limiter and privacy activation are supplied. The local
  // isolated harness executes the actual handler/service with encrypted storage.
  return Response.json({error:'ADVISORY_PERSISTENCE_NOT_CONNECTED'},{status:503,headers:{'Cache-Control':'no-store'}});
}
