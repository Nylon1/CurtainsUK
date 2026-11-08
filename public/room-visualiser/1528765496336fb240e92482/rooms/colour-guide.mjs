// Colour education reads the current selection. It never controls the scene or
// analyses fabric images; future fabric recommendations can be supplied separately.
export const COLOUR_RELATIONSHIPS = Object.freeze({
  tonal: Object.freeze({label:'Tonal', title:'One colour family, different depths', message:'Calm and coordinated.', description:'Try lighter and darker versions of the same colour family.', colours:[['Sage','#afb7a1'],['Olive','#7e8768'],['Deep green','#354f40']], sectors:[4]}),
  analogous: Object.freeze({label:'Analogous', title:'Neighbours on the colour wheel', message:'Soft harmony with a little more variation.', description:'Look at nearby colour families, such as green, blue-green and blue.', colours:[['Green','#7e9875'],['Blue-green','#7baba0'],['Blue','#789bb7']], sectors:[4,5,6]}),
  complementary: Object.freeze({label:'Complementary', title:'Colours from opposite sides', message:'More contrast and visual impact.', description:'Try colours broadly opposite one another, such as blue and warm orange or terracotta.', colours:[['Blue','#789bb7'],['Terracotta','#b87961']], sectors:[0,6]})
});

const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hexColour=value=>/^#[\da-f]{6}$/i.test(value);

/** A selection snapshot only: fabric imagery is not reduced to an invented colour. */
export function buildPalette({roomId,fabricId,colours={}}, {rooms,palettes,fabrics}){
  const room=rooms.find(r=>r.id===roomId),fabric=fabrics.find(f=>f.id===fabricId);
  if(!room)throw Error('UNKNOWN_PALETTE_ROOM');
  if(!fabric)throw Error('UNKNOWN_PALETTE_FABRIC');
  const zones=Object.entries(room.zones).sort(([a],[b])=>(a==='CEILING_MATERIAL')-(b==='CEILING_MATERIAL'));
  const items=[{id:'CURTAIN',label:'Curtain',name:fabric.name,image:fabric.image}];
  for(const [id,zone] of zones){
    const index=colours[id]??zone.initial;
    if(!Number.isInteger(index)||!palettes[zone.palette]?.[index])throw Error('INVALID_PALETTE_SELECTION');
    const [name,hex]=palettes[zone.palette][index];
    if(!hexColour(hex))throw Error('INVALID_PALETTE_COLOUR');
    items.push({id,label:id==='FLOOR_MATERIAL'?'Flooring':zone.label,name,hex});
  }
  return {roomId:room.id,roomName:room.name,fabricId:fabric.id,items};
}

export function paletteMarkup(palette){
  return palette.items.map(item=>`<li class="cg-palette-item" data-palette-zone="${escapeHTML(item.id)}">${item.image?`<img src="${escapeHTML(item.image)}" alt="" width="64" height="64" loading="lazy" decoding="async">`:`<span class="cg-palette-colour" style="background:${item.hex}" aria-hidden="true"></span>`}<span class="cg-palette-label">${escapeHTML(item.label)}</span><span class="cg-palette-name">${escapeHTML(item.name)}</span></li>`).join('');
}

function wheelMarkup(){
  const hues=[12,40,60,90,125,165,200,225,255,285,315,345],point=(r,a)=>[160+r*Math.cos(a*Math.PI/180),160+r*Math.sin(a*Math.PI/180)].map(n=>n.toFixed(3)).join(' ');
  const sectors=hues.map((h,i)=>{const a=i*30-105,b=a+30;return `<path data-wheel-sector="${i}" d="M${point(112,a)} A112 112 0 0 1 ${point(112,b)} L${point(72,b)} A72 72 0 0 0 ${point(72,a)} Z" fill="hsl(${h} 40% 62%)" stroke="#fffdf8" stroke-width="2"/>`;}).join('');
  const labels=[[0,'Warm orange'],[2,'Yellow'],[4,'Green'],[6,'Blue'],[8,'Violet'],[10,'Pink']].map(([i,label])=>{const a=i*30-90,x=160+137*Math.cos(a*Math.PI/180),y=160+137*Math.sin(a*Math.PI/180);return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" dominant-baseline="middle" text-anchor="middle">${label}</text>`;}).join('');
  return `<svg viewBox="0 0 320 320" role="img" aria-labelledby="cg-wheel-title cg-wheel-desc"><title id="cg-wheel-title">Colour relationships at a glance</title><desc id="cg-wheel-desc">A wheel of colour families, labelled warm orange, yellow, green, blue, violet and pink. Choose Tonal, Analogous or Complementary to see a named example below. The wheel is an illustration, not a colour picker.</desc>${sectors}${labels}<text class="cg-wheel-centre" x="160" y="155" text-anchor="middle" data-wheel-label>Tonal</text><text class="cg-wheel-caption" x="160" y="178" text-anchor="middle">a starting point</text></svg>`;
}

function relationshipMarkup(id){
  const item=COLOUR_RELATIONSHIPS[id];
  return `<h4>${item.title}</h4><p>${item.description}</p><ul class="cg-example-chips">${item.colours.map(([label,hex])=>`<li><span style="background:${hex}" aria-hidden="true"></span>${label}</li>`).join('')}</ul><p class="cg-relationship-message">${item.message}</p>`;
}

export function colourGuideMarkup(){
  return `<section class="cg-section" aria-labelledby="cg-heading">
    <div class="cg-heading"><p class="cg-eyebrow">Understand your colours</p><h2 id="cg-heading">How to use colour in your room</h2><p>Start with what you love. Then explore how the colours around it feel together.</p></div>
    <section class="cg-palette" aria-labelledby="cg-palette-heading"><div class="cg-palette-title"><h3 id="cg-palette-heading">Your current palette</h3><span data-palette-room></span></div><ul class="cg-palette-items" data-current-palette></ul><p class="cg-small">Your selected fabric and room colours, side by side. The fabric thumbnail shows its artwork, not a single matched colour.</p><span class="cg-sr-only" data-palette-announcement role="status" aria-live="polite"></span></section>
    <div class="cg-primary-grid">
      <article class="cg-start cg-card"><p class="cg-step">01 — Begin with the fabric</p><h3>Start with your curtain fabric</h3><p>A patterned curtain often already contains several colours. Let it give you a starting point.</p><ol class="cg-steps"><li><strong>Choose a fabric you like.</strong></li><li>Look for its main or background colour.</li><li>Notice one or two accent colours.</li><li>Try those colours or related tones on walls, furniture and cushions.</li></ol><div class="cg-plain"><h4>Choosing a plain?</h4><p>Decide whether your curtain should <strong>blend with the room</strong>, provide <strong>gentle contrast</strong>, or become the <strong>main accent colour</strong>.</p></div><p class="cg-control-path">Curtains <span aria-hidden="true">→</span> Walls <span aria-hidden="true">→</span> Floor <span aria-hidden="true">→</span> Furniture <span aria-hidden="true">→</span> Cushions</p></article>
      <article class="cg-wheel-card cg-card" aria-labelledby="cg-wheel-heading"><p class="cg-step">02 — Explore a relationship</p><h3 id="cg-wheel-heading">Three ways colours work together</h3><div class="cg-wheel-layout"><div class="cg-wheel">${wheelMarkup()}</div><div class="cg-wheel-copy"><div class="cg-relationship-buttons" role="group" aria-label="Colour relationship examples">${Object.entries(COLOUR_RELATIONSHIPS).map(([id,item])=>`<button type="button" data-colour-relationship="${id}" aria-pressed="${id==='tonal'}" aria-controls="cg-relationship-detail">${item.label}</button>`).join('')}</div><div id="cg-relationship-detail" class="cg-relationship-detail" aria-live="polite" aria-atomic="true">${relationshipMarkup('tonal')}</div></div></div><p class="cg-small cg-no-rules">There are no fixed rules — use these relationships as a starting point and choose combinations you enjoy living with.</p></article>
    </div>
    <div class="cg-tips-heading"><p class="cg-eyebrow">Helpful tips</p><h3>A little guidance, room to experiment</h3></div>
    <div class="cg-tips-grid">
      <article class="cg-card cg-tip"><h3>Warm or cool?</h3><div class="cg-temperature"><div><span class="cg-temperature-line cg-warm" aria-hidden="true"></span><h4>Warm colours</h4><p>Cream, warm beige, terracotta, blush and warm browns can make a room feel warmer and more inviting.</p></div><div><span class="cg-temperature-line cg-cool" aria-hidden="true"></span><h4>Cool colours</h4><p>Blue, sage, blue-grey and cooler greens can create a calmer, fresher feel.</p></div></div><p class="cg-small cg-undertone">Neutrals have undertones too. A beige may lean yellow, pink or grey, and these undertones can affect how it works with a curtain fabric.</p></article>
      <article class="cg-card cg-tip"><h3>Remember the floor</h3><p>Flooring is a large area of colour and can strongly affect a scheme.</p><ul class="cg-floor-list"><li><span style="background:#d3c3a6" aria-hidden="true"></span><p><strong>Light oak</strong>Often feels lighter and warmer.</p></li><li><span style="background:#bfa786" aria-hidden="true"></span><p><strong>Natural or medium oak</strong>A balanced, neutral base.</p></li><li><span style="background:#725a47" aria-hidden="true"></span><p><strong>Dark wood</strong>Adds stronger contrast.</p></li><li><span style="background:#c0bdb2" aria-hidden="true"></span><p><strong>Grey floors</strong>Generally create a cooler base.</p></li></ul><p class="cg-small">Choose the closest visualiser floor tone to your existing floor, rather than trying to match it exactly on screen.</p></article>
      <article class="cg-card cg-tip"><h3>A simple way to balance colour</h3><p>The 60–30–10 idea is optional inspiration, not a rule.</p><div class="cg-balance-bar" role="img" aria-label="Colour balance illustration: 60 percent main room colour, 30 percent supporting colour, 10 percent accent colour"><span>60</span><span>30</span><span>10</span></div><dl class="cg-balance-list"><div><dt>60% — Main room colour</dt><dd>Usually walls and large surfaces.</dd></div><div><dt>30% — Supporting colour</dt><dd>Furniture, flooring or curtains.</dd></div><div><dt>10% — Accent colour</dt><dd>Cushions and smaller accessories.</dd></div></dl><p class="cg-small">Patterned curtains can play more than one role because they may contain several colours.</p></article>
    </div>
    <aside class="cg-colour-advisory" aria-labelledby="cg-colour-advisory-heading"><h3 id="cg-colour-advisory-heading">Colours on screen are a guide</h3><p>Screens, lighting and surrounding colours can all change how a colour appears. The visualiser is designed to help you compare colour relationships and overall interior feel rather than provide an exact colour match.</p><p><strong>Always order a physical fabric sample and view it in your own room before making your final fabric choice.</strong></p></aside>
  </section>`;
}

/** Mount once below the visualiser; update only after a selected room, colour or fabric changes. */
export function mountColourGuide(container,catalog){
  if(!container)throw Error('COLOUR_GUIDE_CONTAINER_REQUIRED');
  container.innerHTML=colourGuideMarkup();
  const buttons=[...container.querySelectorAll('[data-colour-relationship]')];
  function selectRelationship(id){
    const item=COLOUR_RELATIONSHIPS[id];
    if(!item)throw Error('UNKNOWN_COLOUR_RELATIONSHIP');
    for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.colourRelationship===id));
    container.querySelector('[data-wheel-label]').textContent=item.label;
    for(const sector of container.querySelectorAll('[data-wheel-sector]')){
      const selected=item.sectors.includes(Number(sector.dataset.wheelSector));
      sector.classList.toggle('cg-sector-selected',selected);
    }
    container.querySelector('#cg-relationship-detail').innerHTML=relationshipMarkup(id);
  }
  for(const button of buttons)button.addEventListener('click',()=>selectRelationship(button.dataset.colourRelationship));
  selectRelationship('tonal');
  let previousPalette='';
  return {
    updatePalette(selection){
      const palette=buildPalette(selection,catalog),markup=paletteMarkup(palette);
      if(markup===previousPalette)return palette;
      previousPalette=markup;
      container.querySelector('[data-palette-room]').textContent=palette.roomName;
      container.querySelector('[data-current-palette]').innerHTML=markup;
      container.querySelector('[data-palette-announcement]').textContent=`${palette.roomName} palette: ${palette.items.map(item=>`${item.label}, ${item.name}`).join('; ')}.`;
      return palette;
    }
  };
}
