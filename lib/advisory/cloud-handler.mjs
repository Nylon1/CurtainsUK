import {CloudSessionStore,verifyCloudPrincipal} from './cloud-store.mjs';
import {createConsultationService} from './service.mjs';
import {createHttpHandler,deploymentGate} from './http.mjs';
// Protected test composition root, deliberately NOT wired into the deployed
// Next route. Auth/session store, private RPC and CSRF bootstrap need a separately
// approved environment. No defaults, key discovery or automatic paid activation.
export function createCloudConsultationHandler({env,origin,auth,issuer,sessionActive,readAccessToken,csrfForSession,rpc,cipher,catalogue,providerForSession,providerKind='mock'}){
  return async request=>{
    const blocked=deploymentGate(request,env);if(blocked)return blocked;
    let store;
    const authenticate=async req=>{
      const principal=await verifyCloudPrincipal({token:await readAccessToken(req),auth,issuer,sessionActive});
      store=new CloudSessionStore({rpc,cipher,ownerId:principal.owner});
      return {...principal,csrf:await csrfForSession(principal)};
    };
    const service={execute:async(owner,command)=>{
      const provider={kind:providerKind,respond:async args=>{
        // The provider receives a durable run/session budget at composition time.
        const selected=await providerForSession({store,sessionId:args.session.id});
        return selected.respond(args);
      }};
      return createConsultationService({store,catalogue,provider}).execute(owner,command);
    }};
    return createHttpHandler({origin,authenticate,service,limiter:{take:()=>store.take()}})(request);
  };
}
