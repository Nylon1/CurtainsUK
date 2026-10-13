// Output-format hygiene, not an intelligence/safety substitute. Applies to all
// customer-visible advice fields, never to evidence IDs or tool receipts.
const terms={MORE_LIKE_THIS:'more like this',NOT_QUITE:'not quite right',NOT_FOR_ME:'not for me',NOT_SURE:'not sure',DISLIKE:'dislike',LIKE:'like',LOVE:'love',PARTIAL_GOVERNED:'partly verified',KNOWLEDGE_INDEX_NOT_ACTIVATED:'fabric knowledge search is not available yet'};
const clean=value=>typeof value==='string'?value.replace(/\b(?:MORE_LIKE_THIS|NOT_QUITE|NOT_FOR_ME|NOT_SURE|DISLIKE|LIKE|LOVE|PARTIAL_GOVERNED|KNOWLEDGE_INDEX_NOT_ACTIVATED)\b/g,t=>terms[t]).replace(/\s*—\s*/g,', '):Array.isArray(value)?value.map(clean):value;
export function customerLanguage(advice){return Object.fromEntries(Object.entries(advice).map(([key,value])=>[key,['evidenceIds','fabricIds','stage'].includes(key)?value:clean(value)]));}
