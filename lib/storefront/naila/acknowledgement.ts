import { GUIDE_PRICE_LEVELS } from '../../fabric-master/guide-price-level';
import type { NailaView } from './types';

/** Client-side wording only, after an acknowledged commit. A click alone is
 * insufficient: its exact value/identity must occur in committed evidence. */
export function selectionAcknowledgement(before: NailaView | null, after: NailaView, action?: Record<string, unknown>): string | null {
  const evidence=after.naila;
  if(!before || before.sessionId!==after.sessionId || after.revision!==before.revision+1
    || !evidence || evidence.sessionId!==after.sessionId || evidence.revision!==after.revision || !action)return null;
  if(action.type==='answer' && before.question?.answers.some(answer=>answer.id===action.answerId)) {
    const chosen=evidence.confirmedPreferences.find(p=>p.dimension===before.question!.id && p.value===action.answerId && p.confidence==='confirmed');
    if(!chosen)return null;
    if(chosen.dimension==='colour-family')return `${chosen.label} is your chosen colour family. Let’s build from there.`;
    if(chosen.dimension==='atmosphere')return `“${chosen.label}” is the feeling you’ve chosen.`;
    return `“${chosen.label}”. I’ve noted that.`;
  }
  if(action.type==='price-level' && evidence.currentPriceLevel===action.level) {
    const level=GUIDE_PRICE_LEVELS.find(level=>level.id===action.level);
    return level?`${level.label} is your chosen price level.`:null;
  }
  if(action.type==='calibrate') {
    const reaction=evidence.calibrationReactions.at(-1);
    if(!reaction || !before.calibrationFabric || reaction.fabricMasterId!==before.calibrationFabric.fabricMasterId || reaction.reaction!==action.reaction)return null;
    const lines:Record<string,string>={LOVE:'You loved that fabric. I’ve noted your reaction.',LIKE:'You liked that fabric. I’ve noted your reaction.',NOT_SURE:'You’re not sure about that fabric yet. That’s useful to know.',DISLIKE:'That fabric wasn’t for you. I’ve noted your reaction.'};
    return lines[reaction.reaction]??null;
  }
  if(action.type==='brief-change') {
    const choice=action.choice as {dimension?:string;value?:string}|undefined;
    const section=after.interiorBrief?.sections.find(s=>s.dimension===choice?.dimension && s.value===choice?.value && s.changed);
    const option=section?.options.find(option=>option.value===section.value);
    return option?`I’ve updated your choice to “${option.label}”.`:null;
  }
  if(action.type==='outcome' && action.event==='FABRIC_SELECTED' && typeof action.fabricMasterId==='string'
    && evidence.currentShortlist.includes(action.fabricMasterId) && !before.naila?.currentShortlist.includes(action.fabricMasterId))return 'That fabric is now in your shortlist.';
  if(action.type==='feedback') {
    const feedback=action.command as {strategyId?:string;fabricId?:string;fabricReaction?:string}|undefined;
    const card=before.directions.find(d=>d.id===feedback?.strategyId)?.cards.find(c=>c.reactionId===feedback?.fabricId);
    const reaction=evidence.fabricReactions.at(-1);
    if(!card || reaction?.fabricMasterId!==card.fabricMasterId || reaction.reaction!==feedback?.fabricReaction)return null;
    const lines:Record<string,string>={LOVE:'You loved that fabric. I’ve noted your reaction.',MORE_LIKE_THIS:'You’d like more like that fabric. I’ve noted that.',NOT_QUITE:'That one isn’t quite right. I’ve noted your feedback.',NOT_FOR_ME:'That fabric wasn’t for you. I’ve noted your reaction.'};
    return lines[reaction.reaction]??null;
  }
  return null;
}
