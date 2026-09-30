// Presentation only. The HCI question's answers determine membership and submitted IDs.
// These existing customer-facing aliases still resolve to their governed HCI answer IDs.
const presentationAliases = { Neutral: 'neutral', Terracotta: 'terracotta' } as const;
const appearance: Record<string, {label:string;swatch:string}> = {
  'white/cream': {label:'White / Cream',swatch:'linear-gradient(90deg,#fff 50%,#eee5cf 50%)'},
  'beige/taupe': {label:'Beige / Taupe',swatch:'linear-gradient(90deg,#d6c4a7 50%,#a69587 50%)'},
  white:{label:'White',swatch:'#f8f7f2'}, cream:{label:'Cream',swatch:'#eee5cf'},
  beige:{label:'Beige',swatch:'#d6c4a7'}, taupe:{label:'Taupe',swatch:'#a69587'},
  [presentationAliases.Neutral]:{label:'Neutral',swatch:'#d4cec1'}, grey:{label:'Grey',swatch:'#999b9b'},
  brown:{label:'Brown / Earthy',swatch:'#85644c'}, blue:{label:'Blue',swatch:'#6689ae'},
  green:{label:'Green',swatch:'#789377'}, pink:{label:'Pink',swatch:'#d79aab'},
  red:{label:'Red',swatch:'#ad4c4f'}, yellow:{label:'Yellow',swatch:'#e4ce78'}, gold:{label:'Gold',swatch:'#d5b75c'},
  'yellow/gold':{label:'Yellow / Gold',swatch:'#d5b75c'},
  purple:{label:'Purple',swatch:'#9478a5'}, black:{label:'Black / Dark',swatch:'#383a3b'},
  orange:{label:'Orange',swatch:'#c77f55'},
  [presentationAliases.Terracotta]:{label:'Terracotta',swatch:'#c77f55'},
  multicolour:{label:'Multicolour',swatch:'conic-gradient(#ba6877,#d5b75c,#789377,#6689ae,#9478a5,#ba6877)'},
};
export function colourPresentation(value:string) {
  return appearance[value] ?? null;
}
