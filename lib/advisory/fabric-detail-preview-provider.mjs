import {fail} from './contracts.mjs';
// Scripted preview only. The real provider already receives consented contexts.
// Keep the running worker's original mock provider/profile untouched.
export function withFabricDetailPreview(base){
  if(base.kind!=='mock')fail('MOCK_PROVIDER_REQUIRED',500);
  return {kind:'mock',async respond(args){
    const context=args.session.contexts.filter(c=>c.value.references?.includes('fabric-detail:v1')).at(-1);
    if(context&&!args.session.messages.some(m=>m.role==='assistant'&&m.at>=context.receivedAt)){
      const id=context.value.fabricIds[0],{data}=await args.execute('lookup_fabric_knowledge',{ids:[id]});
      const fabric=data.find(f=>f.id===id);if(!fabric)fail('UNKNOWN_FABRIC_ID',400);
      return {text:`You’ve brought ${fabric.design} in ${fabric.colour} into the conversation. Let’s consider how it fits your room before making a recommendation. The existing colours, natural light and the amount of pattern around it can all change the effect. What would you like the curtains to bring to the space, and which furnishings are staying?`,stage:'investigate',palette:[],patternDirection:'',textureDirection:'',alternatives:[],questions:['What would you like the curtains to bring to the space?'],nextSteps:[],evidenceIds:[fabric.provenance.id],fabricIds:[]};
    }
    // A detail-page selection does not mean the customer disliked patterns in
    // the visualiser. Preserve actual result contexts for the existing mock.
    return base.respond({...args,session:{...args.session,contexts:args.session.contexts.filter(c=>!c.value.references?.includes('fabric-detail:v1'))}});
  }};
}
