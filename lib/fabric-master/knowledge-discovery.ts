/** Customer labels for the existing governed vocabulary. No new classifications. */
export type KnowledgeOption = { key: string; value: string; count: number; fabricId: string; image: string | null };
const dimensions = [
  ['colour','Colour','swatches'],
  ['pattern','Pattern','fabric-images'],
  ['activity','Visual activity','continuum'],
  ['texture','Texture','fabric-images'],
  ['character','Character','chips'],
  ['presence','Presence','continuum'],
] as const;
const labels: Record<string,string> = {
  relief:'Raised surface detail','pile-like':'Pile appearance','boucle-like':'Bouclé appearance',
  'traditional-motif':'Traditional motif','textured-plain':'Textured plain',
  'subtle-pattern':'Subtle pattern','visible-weave':'Visible weave',
  'subtle-texture':'Subtle texture',low:'Low',minimal:'Minimal',
};
const orders: Record<string,string[]> = {activity:['minimal','low','balanced','busy','statement'],presence:['airy','light','balanced','substantial','rich']};
export function knowledgeDiscovery(options: KnowledgeOption[] = []) {
  return dimensions.map(([key,label,treatment])=>({
    key,label,treatment,active:true,
    options:options.filter(o=>o.key===key && o.count>0 && !['unknown','null',''].includes(o.value.toLowerCase()))
      .sort((a,b)=>orders[key] ? orders[key].indexOf(a.value)-orders[key].indexOf(b.value) : a.value.localeCompare(b.value))
      .map(o=>({value:o.value,label:labels[o.value] ?? o.value.replaceAll('-',' ').replace(/^./,c=>c.toUpperCase()),count:o.count,
        ...(o.image && /^https:\/\/cdn\.shopify\.com\/[^?#]+$/.test(o.image)?{image:o.image}:{}),fabricId:o.fabricId})),
  }));
}
