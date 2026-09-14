/** Accepted events only; raw image bytes and privileged recommendation details never enter feedback. */
export function acceptedHciFeedback(input: {
  sessionId:string; policyVersion:string; recommendationVersion:string; timestamp:string;
  action?: Record<string,unknown>;
  directions?: {id:string;cards:{fabricMasterId:string;reactionId:string}[]}[];
}) {
  const {sessionId,policyVersion,recommendationVersion,timestamp,action}=input;
  const base={sessionId,policyVersion,recommendationVersion,timestamp};
  if(action?.type === "palette") return [{...base,event:"PALETTE_CORRECTION",strategyId:null,fabricMasterId:null,edit:action.edit}];
  if(action?.type !== "refine" || !Array.isArray(action.feedback)) return [];
  return action.feedback.flatMap((feedback: {strategyId:string;fabricId:string;strategyReaction:string|null;fabricReaction:string|null})=>{
    const card=input.directions?.find(d=>d.id===feedback.strategyId)?.cards.find(c=>c.reactionId===feedback.fabricId);
    if(!card) throw Error("HCI_FEEDBACK_IDENTITY_INVALID");
    const identity={...base,strategyId:feedback.strategyId,fabricMasterId:card.fabricMasterId};
    return [
      ...(feedback.strategyReaction ? [{...identity,event:"STRATEGY_REACTION",reaction:feedback.strategyReaction}] : []),
      ...(feedback.fabricReaction ? [{...identity,event:"FABRIC_REACTION",reaction:feedback.fabricReaction}] : []),
    ];
  });
}
