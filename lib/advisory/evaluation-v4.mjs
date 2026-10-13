import {foundationsCases as previousCases,foundationsRubric as previousRubric} from './evaluation-v3.mjs';
import {requireFreshEvaluationApproval as baseApproval} from './evaluation-v2.mjs';

// The saved v3 transcripts and criteria remain unchanged. This suite carries
// the owner's case-by-case corrections without rewriting historical evidence.
export const EVALUATION_VERSION='jane-foundations-v4';
const revisedCriteria={
  'tool-teacher':['Use verified tool guidance','No invented visualiser heading selector; direct heading comparisons to Curtain Style with its real link'],
  contradiction:['Latest preference replaces earlier assumption','Clarify incompatible priorities without being dismissive; never assume an unstated wall colour'],
  'small-dark-room':['Do not assume every customer wants a brighter room','Separate lightness, contrast and visual weight; do not repeat an unanswered wall-colour question after the customer gives a different preference'],
  'fabric-search':['Use the full hosted index for descriptive colour, pattern, texture and composition retrieval','Check each proposed exact identity against the live governed retail catalogue before calling it purchasable'],
  'natural-brief-search':['Translate the room brief into alternative indexed fabric attributes and explain narrow-query misses','Evaluate exact candidate facts and current retail eligibility; do not infer a muted tone or quiet texture from a broad match']
};
export const foundationsCases=previousCases.map(c=>revisedCriteria[c.id]?{...c,review:revisedCriteria[c.id]}:c);
export const foundationsRubric={...previousRubric,reviewState:'OWNER_FEEDBACK_CORRECTIONS_AWAITING_REAL_MODEL_AND_HUMAN_REVIEW'};
export const requireFreshEvaluationApproval=(approval,options={})=>baseApproval(approval,{...options,suiteVersion:EVALUATION_VERSION});
