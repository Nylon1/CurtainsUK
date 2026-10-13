import {completionRubric} from './evaluation-v2.mjs';
export function assessHumanScorecard(card){
  if(typeof card?.reviewer!=='string'||!card.reviewer.trim()||!Number.isFinite(Date.parse(card.reviewedAt))||!card.notes||!Array.isArray(card.criticalFailures)||!Array.isArray(card.scores)||card.scores.length!==completionRubric.dimensions.length||card.scores.some(n=>!Number.isInteger(n)||n<0||n>4))return {status:'pending',passed:false};
  if(card.disputed===true)return {status:'pending-second-review',passed:false,requiresSecondReview:true};
  const passed=card.criticalFailures.length===0&&card.scores.every(n=>n>=3);
  return {status:passed?'pass':'fail',passed,requiresSecondReview:card.disputed===true};
}
