// A server-side admission rule. Browsers and retrieved pages cannot demand a
// search directly; the latest customer question must call for a verifiable fact.
export function needsSpecialistSearch(message){
  if(typeof message!=='string')return false;
  const q=message.toLowerCase();
  const exact=/(?:exact|specification|specs?|manual|manufacturer|model|series|part\s*(?:no\.?|number)|certif|tested|test report|rating|load|weight limit|bracket spacing|fixing centres|bend radius|motor|wiring|fire rating|decibels?|\bdb\b|alpha[- ]?w|nrc|installation instructions|current instructions)/i.test(q);
  const lookup=/(?:look up|search|check the (?:manufacturer|manual|spec|test)|find the (?:manual|report|instructions))/i.test(q);
  const namedSystem=/(?:track|pole|rail|bracket|system|fit|install|measure)\b.{0,90}\b(?:[a-z][a-z -]{2,28}\s+[0-9]{2,6}|[a-z][a-z-]*[0-9]{2,6})\b/i.test(q);
  return exact||lookup||namedSystem;
}

export function verifiedCitations(response){
  const output=Array.isArray(response?.output)?response.output:[];
  const searched=output.some(item=>item?.type==='web_search_call'&&item.status==='completed');
  const available=new Set(output.filter(item=>item?.type==='web_search_call').flatMap(item=>item.action?.sources??[]).map(source=>source.url));
  const citations=[];
  for(const message of output.filter(item=>item?.type==='message'&&item.role==='assistant')){
    for(const content of message.content??[]){
      for(const note of content.annotations??[]){
        if(note.type!=='url_citation'||!available.has(note.url))continue;
        try{
          const url=new URL(note.url);
          if(url.protocol!=='https:'||url.username||url.password||url.href.length>1200)continue;
          if(!citations.some(c=>c.url===url.href))citations.push({title:String(note.title||url.hostname).slice(0,150),url:url.href});
        }catch{}
      }
    }
  }
  return {searched,citations:citations.slice(0,4)};
}
