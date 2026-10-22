/** Browser regression checks against the local example-data preview only.
 * Start scripts/fi-visual-preview.mjs first, then run this script.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, openSync, closeSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
const binary = process.env.AGENT_BROWSER_BIN ?? (process.platform === 'win32' ? join(process.env.APPDATA, 'npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe') : 'agent-browser');
const session = `fi-regression-${process.pid}`;
const output = resolve('.next/fi-visual-checks');
mkdirSync(output, { recursive: true });
const run = (...args) => {
  // The Windows browser daemon inherits pipes on first launch. File-backed
  // output lets the CLI finish without waiting for that background daemon.
  const stdout = join(output, 'command.out');
  const stderr = join(output, 'command.err');
  const out = openSync(stdout, 'w'), err = openSync(stderr, 'w');
  try { execFileSync(binary, ['--session', session, ...args], { stdio: ['ignore', out, err], timeout: 35000 }); }
  catch (error) { throw new Error(`${args.join(' ')}: ${readFileSync(stderr, 'utf8') || error.message}`); }
  finally { closeSync(out); closeSync(err); }
  return readFileSync(stdout, 'utf8').trim();
};
const evaluate = (code) => JSON.parse(run('eval', code, '--json')).data.result;
const wait = (expression) => run('wait', '--fn', expression);
const requests = async () => (await fetch('http://127.0.0.1:4185/__preview/requests')).json();
const open = (screen, extra = '') => {
  run('open', `http://127.0.0.1:4185/?screen=${screen}&entry=${screen === 'welcome' ? 'match' : 'guided'}${extra}`);
  wait('!!document.querySelector("[aria-current=step]")');
  wait('!document.body.innerText.includes("Preparing your Fabric Intelligence journey")');
  if (evaluate('!!document.querySelector("dialog[open]")')) click('Continue my choices');
};
const click = (name) => run('find', 'role', 'button', 'click', '--name', name, '--exact');
const results = [];
try {
  for (const width of [1440, 390, 320]) {
    run('set', 'viewport', String(width), '900');
    for (const screen of ['welcome', 'taste', 'price', 'calibration', 'brief', 'directions', 'final', 'palette']) {
      open(screen);
      const layout = evaluate('({overflow:document.documentElement.scrollWidth>innerWidth,scroll:scrollY,headings:document.querySelectorAll("h1,h2").length})');
      assert.equal(layout.overflow, false, `${screen} at ${width}: horizontal overflow`);
      assert.equal(layout.scroll, 0, `${screen} at ${width}: opens partway down`);
      assert.ok(layout.headings > 0);
      run('screenshot', join(output, `${screen}-${width}.png`));
      results.push(`${screen} ${width}: correct initial view, no overflow`);
    }
  }
  run('set', 'viewport', '390', '900');
  open('welcome');
  run('click', 'a[href="#your-reference"]');
  assert.ok(evaluate('scrollY>0'), 'photo entry reaches the uploader');
  run('upload', 'input[type=file]', resolve('public/reference-experience/living-room.jpg'));
  wait('!!document.getElementById("analysis-title")');
  wait('scrollY===0');
  run('screenshot', join(output, 'analysis-390.png'));
  click('Build my Room Palette →'); wait('!!document.getElementById("room-palette-title")');
  wait('scrollY===0');
  assert.equal(evaluate('document.documentElement.scrollWidth>innerWidth'), false);
  run('screenshot', join(output, 'palette-with-photo-390.png'));
  results.push('photo upload, analysis and palette transitions open at the top and retain the uploaded preview');
  // The optional-image route uses the same initial consultation, not a second session.
  open('welcome');
  const beforeGuided = (await requests()).length;
  click('Start with my style'); wait('!!document.getElementById("taste-heading")');
  assert.equal((await requests()).length, beforeGuided);
  evaluate('window.scrollTo(0,700)');
  click('01 Calm and restful'); wait('!!document.getElementById("price-heading")');
  assert.equal(evaluate('scrollY'), 0, 'next question starts at the top');
  click('02 Luxury Curtains from £50–£149.99'); wait('!!document.getElementById("eye-heading")');
  click('Like this'); wait('!!document.getElementById("brief-heading")');
  run('find', 'first', 'button[aria-controls^="brief-"]', 'click');
  click('A different feel'); wait('document.body.innerText.includes("Saved preference")');
  assert.equal(evaluate('document.activeElement.id'), 'brief-edit-atmosphere', 'saving returns keyboard focus to the edited preference');
  click('Show my fabric suggestions'); wait('!!document.getElementById("directions-heading")');
  assert.equal(evaluate('scrollY'), 0, 'results start at the top');
  results.push('existing style, price, calibration, brief change and confirmation commands reach results');

  // Deterministic staggered catalogue responses expose duplicate request cascades.
  const before = (await requests()).length;
  open('directions', '&session=11111111-1111-4111-8111-111111111111');
  wait('document.querySelectorAll("a").length>18');
  run('wait', '1800');
  const catalogue = (await requests()).slice(before).filter((r) => r.type === 'catalog');
  assert.equal(catalogue.length, new Set(catalogue.map((r) => r.id)).size, 'one catalogue read per fabric');
  assert.equal(evaluate('document.body.innerText.includes("Adjust my brief")'), true);
  const links = evaluate('[...document.querySelectorAll("a")].map(a=>({text:a.textContent,href:a.getAttribute("href")}))');
  assert.ok(links.some((a) => a.text.includes('Order sample') && a.href.includes('fabric=')));
  assert.ok(links.some((a) => a.text.includes('Make curtains') && a.href.includes('fabric=')));
  assert.ok(links.some((a) => a.text.includes('View fabric details') && a.href.includes('/pages/fabric/')));
  assert.ok(links.some((a) => a.text.includes('Room Visualiser') && a.href.includes('/pages/room-visualiser?fabric=')));
  run('find', 'first', 'details summary', 'click');
  const extraLinks = evaluate('[...document.querySelectorAll("details[open] a")].map(a=>({text:a.textContent,href:a.href}))');
  assert.ok(extraLinks.some((a) => a.text.includes('Make cushions') && a.href.includes('/pages/cushion-studio?fabric=')));
  assert.ok(extraLinks.some((a) => a.text.includes('Try Making Studio') && a.href.includes('#cuk-making-studio')));
  assert.ok(extraLinks.some((a) => a.text.includes('Ask Jane') && a.href.includes('jane_fabric=')));
  run('screenshot', join(output, 'fabric-options-390.png'));
  run('find', 'first', 'button', 'click'); wait('!!document.querySelector("dialog[open]")');
  assert.equal(evaluate('document.activeElement.textContent'), 'Keep my brief', 'safe initial dialog focus');
  const beforeCancel = (await requests()).length;
  run('press', 'Escape');
  assert.equal(evaluate('!!document.querySelector("dialog[open]")'), false);
  assert.equal((await requests()).length, beforeCancel, 'cancel makes no server changes');
  results.push('catalogue deduplication, shopping links and keyboard restart cancellation');

  // Adjust uses the existing command and session, preserves choices, and returns
  // to real suggestions through the existing confirmation command.
  const oldSession = evaluate('sessionStorage.getItem("cuk-fi-premium-consultation-v1")');
  const beforeAdjust = (await requests()).length;
  click('Adjust my brief'); wait('document.body.innerText.includes("Fine-tune your choices.")');
  assert.equal(evaluate('scrollY'), 0, 'Adjust opens at the beginning of the brief');
  assert.equal(evaluate('sessionStorage.getItem("cuk-fi-premium-consultation-v1")'), oldSession);
  assert.ok(evaluate('document.body.innerText.includes("Your earlier answers are still here")'));
  run('click', 'a[href="#brief-section-texture"]');
  click('Edit Texture'); click('A different feel');
  wait('document.body.innerText.includes("Texture saved: A different feel.")');
  assert.equal(evaluate('document.activeElement.id'), 'brief-edit-texture');
  assert.ok(evaluate('scrollY>0'), 'saving within a screen does not reset scrolling');
  run('screenshot', join(output, 'saved-brief-390.png'));
  click('Update my fabric suggestions'); wait('!!document.getElementById("directions-heading")');
  assert.equal(evaluate('scrollY'), 0);
  click('Adjust my brief'); wait('!!document.getElementById("brief-heading")');
  assert.ok(evaluate('document.getElementById("brief-section-texture").innerText.includes("A different feel")'));
  const adjusted = (await requests()).slice(beforeAdjust).filter((r) => r.type !== 'catalog');
  assert.ok(adjusted.some((r) => r.type === 'brief-adjust'));
  assert.ok(adjusted.some((r) => r.type === 'brief-change'));
  assert.ok(adjusted.some((r) => r.type === 'brief-confirm'));
  assert.ok(adjusted.every((r) => r.sessionId === oldSession && r.type !== 'initial'));
  results.push('Adjust retains the same session, saves preferences, supports jump links and refreshes suggestions');
  results.push('fabric-specific detail, room, cushion, Making Studio and Jane links retain their destinations');
  console.log(results.join('\n'));
  writeFileSync(join(output, 'results.json'), JSON.stringify({ passed: results.length, results }, null, 2));
} finally { run('close'); }
