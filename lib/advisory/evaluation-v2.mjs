import {evaluationCases,humanRubric} from './evaluation.mjs';
import {JANE_VERSION} from './profiles.mjs';
import {fail,UUID} from './contracts.mjs';
export const EVALUATION_VERSION='jane-completion-v2';
export const completionCases=[...evaluationCases,
  {id:'coordinate-or-contrast',turns:['My sofa is olive green, with oak floors and warm neutral walls. Should curtains coordinate or contrast?','I do not want green curtains. Could contrast still feel restful?','Give me two genuinely different directions, without choosing a fabric yet.'],review:['Distinguish fixed green furniture from curtain preference','Explain restrained contrast versus tonal coordination and tradeoffs']},
  {id:'pattern-choice',turns:['I cannot choose between a small geometric and a large floral.','The rug is striped and the cushions are plain. I like an expressive room.','How can I compare them fairly in the visualiser?'],review:['Investigate contrast and competing scale without a universal small-pattern rule','Propose controlled comparisons using real controls']},
  {id:'small-dark-room',turns:['Our sitting room is small and quite dark. Must I have white curtains?','I actually enjoy a cosy, enveloping room and dislike stark white.','Could we keep that mood but avoid everything feeling heavy?'],review:['Do not assume every customer wants a brighter room','Separate lightness, contrast, visual weight and privacy requirements']},
  {id:'reject-first-direction',turns:['I want my bedroom to feel calm; the walls are pale blue.','I dislike all those suggestions. They feel too cold and impersonal.','Please try a different approach and do not repeat the same palette.'],review:['Accept rejection without defending the previous recommendation','Change the relevant design relationship and ask only a useful question']},
  {id:'outside-product-range',turns:['Can curtains completely stop road noise coming through my old windows?','I need a guarantee before buying; I cannot afford to waste money.','What should I investigate before choosing any fabric?'],review:['No sound-isolation guarantee or unsupported numeric performance','Suggest appropriate building/acoustic investigation without a forced sale']},
  {id:'natural-brief-search',turns:['Show me fabric types for a warm neutral room with oak floors and olive-green furniture.','The furniture will stay. I want the curtains softer and lighter, but not a stark white.','Can you search for a quiet texture and explain the limits of your results?'],review:['Translate room context into curtain attributes instead of copying all nouns into a query','Distinguish natural style advice, actual retrieval and partial coverage']}
];
export const completionRubric={...humanRubric,examples:{
  understands:{pass:'Retains the olive sofa as a fixed furnishing while respecting no green curtains.',fail:'Treats the olive sofa as a request for green curtains.'},
  alternatives:{pass:'Offers tonal warm mushroom and restrained dusty-clay contrast, explaining different effects.',fail:'Lists beige, oatmeal and cream as supposedly different design strategies with no tradeoff.'},
  feedback:{pass:'Acknowledges a cold-feeling scheme and revisits undertones/texture without defending it.',fail:'Repeats the rejected blue-grey palette or asks again for known wall colours.'},
  evidence:{pass:'Reports a partial-index limitation and offers general styling advice without invented fabrics.',fail:'Claims a product is available because it has a Fabric Master identity.'},
  voice:{pass:'Answers directly in concise British English with at most one decision-changing question.',fail:'Exposes NOT_QUITE, repeats a greeting or asks a questionnaire already answered.'}
},reviewState:'NEW_PROFILE_NOT_REAL_MODEL_EVALUATED'};
export function requireFreshEvaluationApproval(a,{now=Date.now(),model='gpt-6.1-sol'}={}){
  if(a?.approved!==true||!a.ownerApprovalReference||!new RegExp(UUID).test(a.runId??'')||a.model!==model||a.maxUsd!==5||a.purpose!=='invented-jane-evaluation'||a.profileVersion!==JANE_VERSION||a.suiteVersion!==EVALUATION_VERSION||!Number.isFinite(Date.parse(a.expiresAt))||Date.parse(a.expiresAt)<=now||Date.parse(a.expiresAt)>now+86400000)fail('NEW_OWNER_BUDGET_APPROVAL_REQUIRED',403);
  return a;
}
