/** Local-only presentation preview. Example responses, no service credentials or orders.
 * Run: node --import tsx scripts/fi-visual-preview.mjs
 * Tests may use /__preview/requests for command counts, never production data.
 */
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { createPalette, editPalette } from '../vendor/hci-approved/intelligence/reference-images/palette.ts';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, '.next/fi-visual-preview');
await mkdir(output, { recursive: true });
await build({ entryPoints: [resolve(root, 'components/premium-proxy-entry.tsx')], bundle: true, format: 'iife', platform: 'browser', jsx: 'automatic', target: ['es2020'], minify: true, outdir: output, entryNames: 'premium', loader: { '.module.css': 'local-css' }, alias: { '@': root }, plugins: [{ name: 'proxy-preview', setup(plugin) {
  plugin.onResolve({ filter: /^next\/link$/ }, () => ({ path: resolve(root, 'components/premium-proxy-link.tsx') }));
  plugin.onResolve({ filter: /^next\/image$/ }, () => ({ path: resolve(root, 'components/premium-proxy-image.tsx') }));
} }] });
const fabrics = JSON.parse(await readFile(resolve(root, 'scripts/fixtures/fi-visual-fabrics.json'), 'utf8'));
const profiles = JSON.parse(await readFile(resolve(root, 'generated/fabric-profile-sitemap.json'), 'utf8')).profiles;
for (const fabric of fabrics) {
  fabric.fabricProfileUrl = profiles.find((profile) => profile.fabricMasterId === fabric.id)?.canonicalUrl;
  fabric.browseReady = true; fabric.launchReady = true;
}
const screens = ['welcome', 'taste', 'price', 'calibration', 'brief', 'directions', 'final', 'palette'];
const requests = [];
const sessions = new Map();
let sequence = 0;
const option = (id, label) => ({ id, label, group: 'Your preference', dimension: 'pattern' });
const feedback = { keep: [option('keep:pattern', 'The pattern')], change: [option('change:warmer', 'Warmer'), option('change:cooler', 'Cooler'), option('change:plainer', 'Quieter'), option('change:patterned', 'More pattern'), option('change:texture', 'More texture')] };
const directions = [0, 1].map((i) => ({ id: `preview-direction-${i}`, label: i ? 'A fresh perspective' : 'Based on your taste', purpose: i ? 'A different way to explore the colours and character you enjoy.' : 'A starting point shaped by the colours, patterns and character you enjoy.', status: 'READY', feedback, cards: fabrics.map((fabric) => ({ fabricMasterId: fabric.id, supplierSku: fabric.id, reactionId: fabric.id, commerceToken: 'preview-only', explanation: ['An illustrative selection for this design preview. Explore the fabric, try a sample and see how it feels in your room.'], feedback })) }));
const sections = [['atmosphere', 'Room feeling', 'The atmosphere you would like to create.', 'Calm and restful'], ['pattern', 'Pattern', 'How much pattern feels right for you.', 'Botanical'], ['colour.family', 'Colour direction', 'A starting point for your colour preferences.', 'Soft green'], ['texture', 'Texture', 'The surface and character you enjoy.', 'A gentle woven texture'], ['sheen', 'Finish', 'How you prefer the fabric to catch the light.', 'Matte']].map(([dimension, title, description, value]) => ({ dimension, title, description, value, changed: false, options: [{ value, label: value }, { value: 'alternative', label: 'A different feel' }] }));
function palette() {
  let state = createPalette({ schema: 'hci-draft-palette-observation-v1', palette: { primary: ['cream'], secondary: ['green'], accent: ['brown'] } }, { consultationId: 'visual-preview', imageHash: `sha256:${'a'.repeat(64)}`, modelVersion: 'preview' });
  state = editPalette(state, { id: 'begin', revision: state.revision, type: 'begin-review' });
  return { recordId: 'preview-palette', state };
}
function view(screen, id) {
  const phase = ['welcome', 'taste', 'palette'].includes(screen) ? 'discovery' : screen;
  return { sessionId: id, revision: 0, phase, profileSummary: 'Example preferences for the local design preview.', question: phase === 'discovery' ? { id: 'atmosphere', prompt: 'How would you like the room to feel?', answers: ['Calm and restful', 'Warm and welcoming', 'Crisp and minimal', 'Rich and expressive'].map((label, i) => ({ id: `answer-${i}`, label })) } : null, stimulusId: null, tasteProgress: { current: 1, total: 3 }, priceLevel: { selected: 'LUXURY' }, calibrationFabric: screen === 'calibration' ? { fabricMasterId: fabrics[0].id, supplierSku: fabrics[0].id, brand: fabrics[0].brand, design: fabrics[0].design, colourway: fabrics[0].colour, imageUrl: fabrics[0].images[0].url } : null, calibrationProgress: { current: 1, total: 8 }, interiorBrief: ['brief', 'directions', 'final'].includes(screen) ? { status: screen === 'brief' ? 'HCI_PROPOSED' : 'CUSTOMER_CONFIRMED', version: 1, sections: structuredClone(sections) } : null, palette: screen === 'palette' ? palette() : null, directions: ['directions', 'final'].includes(screen) ? [directions[0], { ...directions[1], cards: [] }] : [], learning: null, ...(['directions', 'final'].includes(screen) ? { directionDelivery: { current: 1, total: 2 } } : {}) };
}
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const json = (value, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
  try {
    if (url.pathname === '/__preview/requests') return json(requests);
    if (url.pathname.endsWith('/premium-session')) return json({ capability: 'local-preview-only' });
    if (url.pathname.endsWith('/premium-asset')) {
      const name = url.searchParams.get('name');
      if (!['premium.js', 'premium.css', 'living-room.jpg'].includes(name)) return json({}, 404);
      res.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'image/jpeg');
      res.end(await readFile(name === 'living-room.jpg' ? resolve(root, 'public/reference-experience/living-room.jpg') : resolve(output, name))); return;
    }
    if (url.pathname.endsWith('/premium-catalog')) {
      const id = url.searchParams.get('fabric'); requests.push({ type: 'catalog', id });
      await new Promise((done) => setTimeout(done, 120 + fabrics.findIndex((f) => f.id === id) * 100));
      return json({ fabric: fabrics.find((f) => f.id === id) ?? null });
    }
    if (url.pathname.endsWith('/premium-command')) {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const { command } = JSON.parse(Buffer.concat(chunks));
      const cookieScreen = req.headers.cookie?.match(/fi-preview-screen=(\w+)/)?.[1] ?? 'welcome';
      let current = command.sessionId && sessions.get(command.sessionId);
      requests.push({ type: command.action?.type ?? 'initial', sessionId: command.sessionId, revision: command.revision });
      if (!current) {
        const id = `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`;
        current = view(command.sessionId ? cookieScreen : sequence === 1 ? cookieScreen : 'taste', id);
        // Every fresh preview document requests the selected fixture screen; a
        // restart in that document requests a normal new discovery session.
        if (req.headers['x-fi-preview-initial'] === '1') current = view(cookieScreen, id);
      } else current = structuredClone(current);
      const action = command.action;
      if (action) {
        // The preview keeps real handoff URLs inspectable but cannot initiate
        // a sample/cart intent or submit a synthetic commerce token to live.
        if (action.type === 'outcome') return json({ error: 'This is a design preview. Use View fabric details to visit the live fabric page.' }, 400);
        if (action.type === 'direction-prepare' || action.type === 'direction-hydrate') {
          const result = { ...current, directionDelivery: { current: 2, total: 2 }, directions: [{ ...directions[1], cards: action.type === 'direction-hydrate' ? directions[1].cards : [] }] };
          if (action.type === 'direction-prepare') await new Promise((done) => setTimeout(done, 1500));
          return json(result);
        }
        if (action.type === 'answer') { current = { ...view('price', current.sessionId), revision: current.revision }; }
        if (action.type === 'price-level') { current = { ...view('calibration', current.sessionId), revision: current.revision }; }
        if (action.type === 'calibrate') { current = { ...view('brief', current.sessionId), revision: current.revision }; }
        if (action.type === 'brief-change') { const section = current.interiorBrief.sections.find((s) => s.dimension === action.choice.dimension); section.value = action.choice.value; section.changed = true; }
        if (action.type === 'brief-adjust') { current.phase = 'brief'; current.interiorBrief.status = 'HCI_PROPOSED'; current.directions = []; delete current.directionDelivery; }
        if (action.type === 'brief-confirm') { current = { ...view('directions', current.sessionId), revision: current.revision, interiorBrief: { ...current.interiorBrief, status: 'CUSTOMER_CONFIRMED' } }; await new Promise((done) => setTimeout(done, 600)); }
        if (action.type === 'image') current.palette = palette();
        if (action.type === 'palette') current.palette.state = editPalette(current.palette.state, action.edit);
        if (action.type === 'finish') current.phase = 'final';
        current.revision += 1;
      }
      sessions.set(current.sessionId, current);
      return json(current);
    }
    const screen = screens.includes(url.searchParams.get('screen')) ? url.searchParams.get('screen') : 'welcome';
    res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Set-Cookie', `fi-preview-screen=${screen}; Path=/; SameSite=Lax`);
    res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fabric Intelligence design preview</title><link rel="stylesheet" href="/apps/curtainsuk-decision/premium-asset?name=premium.css"><style>body{margin:0}.preview-nav{padding:10px 18px;background:#213e32;color:white;font:12px Arial;display:flex;gap:14px;flex-wrap:wrap}.preview-nav a{color:white}</style></head><body><nav class="preview-nav" aria-label="Preview screens"><b>Design preview · example data</b>${screens.map((s) => `<a href="/?screen=${s}&entry=${s === 'welcome' ? 'match' : 'guided'}">${s}</a>`).join('')}</nav><div id="curtainsuk-premium-root"></div><script>window.__CURTAINSUK_PREMIUM_PROXY__=true;sessionStorage.removeItem('cuk-fi-premium-consultation-v1');sessionStorage.removeItem('cuk-premium-consultation-v1');const realFetch=window.fetch;let first=true;window.fetch=(url,init)=>{if(String(url).endsWith('/premium-command')&&first){first=false;init={...init,headers:{...init.headers,'x-fi-preview-initial':'1'}}}return realFetch(url,init)};</script><script src="/apps/curtainsuk-decision/premium-asset?name=premium.js" defer></script></body></html>`);
  } catch (error) { console.error(error.message); json({ error: 'Local preview could not complete the example.' }, 500); }
});
server.listen(4185, '127.0.0.1', () => console.log('Fabric Intelligence design preview: http://127.0.0.1:4185'));
