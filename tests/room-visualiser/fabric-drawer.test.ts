import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assets from '../../lib/room-visualiser/assets.json';
import fixed140 from '../../lib/room-visualiser/fixed140-assignments.json';
import {searchVisualiserFabrics} from '../../lib/room-visualiser/visualiser-catalogue';
import type {searchRetailFabrics} from '../../lib/fabric-master/retail-repository';

test('visualiser searches only approved, current, scale-matched fabrics across pages', async () => {
  const approved = assets.fabrics.slice(0, 27);
  assert.equal(approved.length, 27);
  const source = ['unsupported-fabric', ...approved.map(item => item.fabricId), 'unsupported-last'];
  const records = new Map(approved.map(item => [item.fabricId, {
    id: item.fabricId, design: item.id, colour: 'Blush',
    horizontalRepeatMm: item.hRepeat == null ? null : item.hRepeat * 10,
    verticalRepeatMm: item.vRepeat == null ? null : item.vRepeat * 10,
    patternMatchType: 'STRAIGHT',
  }]));
  // The asset ID exists but its current supplier repeat has changed.
  const stale = records.get(approved[0].fabricId)!;
  records.set(stale.id, {...stale, verticalRepeatMm: 9999});
  const calls: URLSearchParams[] = [];
  const browse = (async (params: URLSearchParams, options: {candidateIds?: ReadonlySet<string>}) => {
    calls.push(new URLSearchParams(params));
    assert.equal(options.candidateIds?.has('unsupported-fabric'), false);
    const offset = (Number(params.get('page')) - 1) * 24;
    const sourceIds = source.slice(offset, offset + 24);
    return {sourceIds, total: source.length, fabrics: sourceIds.filter(id => options.candidateIds?.has(id)).map(id => records.get(id)).filter(Boolean), facets: {colour:['pink'],pattern:['floral']}};
  }) as typeof searchRetailFabrics;
  const filters = new URLSearchParams({query:'flowers',colour:'pink',pattern:'floral',brand:'not allowed',sample:'AVAILABLE'});
  const first = await searchVisualiserFabrics(filters, browse);
  assert.equal(first.fabrics.length, 24);
  assert.ok(first.fabrics.every(fabric => fabric.roomPreview.available));
  assert.ok(first.nextCursor !== null);
  const second = await searchVisualiserFabrics(new URLSearchParams({...Object.fromEntries(filters), cursor:String(first.nextCursor)}), browse);
  assert.equal(second.fabrics.length, 2);
  assert.equal(second.nextCursor, null);
  assert.equal(new Set([...first.fabrics, ...second.fabrics].map(fabric => fabric.id)).size, 26);
  assert.ok(calls.every(call => call.get('query') === 'flowers' && call.get('colour') === 'pink' && call.get('pattern') === 'floral'));
  assert.ok(calls.every(call => !call.has('brand') && !call.has('sample')));
});

test('visualiser Browse includes published FIXED140 assignments and routes them to V1', async () => {
  const id = 'pt-1204-212';
  assert.ok(id in fixed140.assignments);
  const browse = (async (_params: URLSearchParams, options: {candidateIds?: ReadonlySet<string>}) => {
    assert.equal(options.candidateIds?.has(id), true);
    return {sourceIds:[id],total:1,facets:{},fabrics:[{id}]};
  }) as typeof searchRetailFabrics;
  const result = await searchVisualiserFabrics(new URLSearchParams(), browse);
  assert.equal(result.fabrics.length, 1);
  assert.equal(result.fabrics[0].id, id);
  assert.equal(result.fabrics[0].roomPreview.available, true);
  assert.equal(result.fabrics[0].roomPreview.rendererProfile, 'FIXED140_SINGLE_WIDTH_V1');
});

test('sparse supported results scan past empty Browse pages but stop at a bounded refinement state', async () => {
  const supported = assets.fabrics[0];
  const source = Array.from({length: 24 * 17}, (_, index) => `unsupported-${index}`);
  source[24 * 3 + 1] = supported.fabricId;
  let calls = 0;
  const browse = (async (params: URLSearchParams) => {
    calls++;
    const ids = source.slice((Number(params.get('page')) - 1) * 24, Number(params.get('page')) * 24);
    return {sourceIds:ids,total:source.length,facets:{},fabrics:ids.includes(supported.fabricId) ? [{id:supported.fabricId,
      horizontalRepeatMm:supported.hRepeat == null ? null : supported.hRepeat * 10,
      verticalRepeatMm:supported.vRepeat == null ? null : supported.vRepeat * 10}] : []};
  }) as typeof searchRetailFabrics;
  const result = await searchVisualiserFabrics(new URLSearchParams(), browse);
  assert.deepEqual(result.fabrics.map(fabric => fabric.id), [supported.fabricId]);
  assert.equal(result.refineSearch, false);
  assert.ok(result.nextCursor !== null);
  assert.equal(calls, 16);
  source[24 * 3 + 1] = 'unsupported-too';
  calls = 0;
  const empty = await searchVisualiserFabrics(new URLSearchParams(), browse);
  assert.deepEqual(empty.fabrics, []);
  assert.equal(empty.refineSearch, true);
  assert.equal(empty.nextCursor, null);
  assert.equal(calls, 16);
});

test('the visualiser drawer has only Search, Colour and Pattern; normal Browse retains its own full filters', () => {
  const drawer = readFileSync('lib/room-visualiser/runtime/rooms/customer.html', 'utf8');
  const normal = readFileSync('shopify-theme/curtainsuk-dawn-16/sections/curtainsuk-fabric-browser.liquid', 'utf8');
  const drawerForm = drawer.slice(drawer.indexOf('<form data-cuk-fabric-filters'), drawer.indexOf('</form>', drawer.indexOf('<form data-cuk-fabric-filters')));
  for (const name of ['query','colour','pattern']) assert.match(drawerForm, new RegExp(`name="${name}"`));
  for (const name of ['brand','collection','sample','availability','guidePrice','style','character']) assert.doesNotMatch(drawerForm, new RegExp(`name="${name}"`));
  for (const name of ['query','brand','collection','colour','pattern','sample','availability']) assert.match(normal, new RegExp(`name="${name}"`));
  assert.doesNotMatch(normal, /data-cuk-visualiser/);
});

test('shared browser renders normal Browse commerce cards unchanged while visualiser cards stay selection-led', () => {
  let source = readFileSync('shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-storefront.js', 'utf8');
  source = source.replace(/\}\)\(\);\s*$/, 'window.__renderFabricCards = renderFabricCards;})();');
  const context = {window:{},document:{querySelectorAll:() => [],createElement:() => ({className:'',innerHTML:'',querySelector:() => null})},
    localStorage:{getItem:() => null},location:{search:'',origin:'https://www.curtainsuk.com'}, URLSearchParams};
  vm.runInNewContext(source, context);
  const fabric = {id:'sdg-f1541-01',brand:'Clarke & Clarke',supplier:'Sanderson',collection:'Vintage',design:'Bergamot',colour:'Blush/Linen',
    verticalRepeatMm:465,usableWidthMm:1350,composition:[{percentage:100,material:'Cotton'}],imageReferences:[],sampleAvailable:true,
    availability:'Sample available',roomPreview:{available:true},fabricProfileUrl:'https://www.curtainsuk.com/pages/fabric/bergamot'};
  function render(visualiser:boolean) {
    const grid = {innerHTML:'',cards:[] as {innerHTML:string}[],appendChild(card:{innerHTML:string}){this.cards.push(card);}};
    const count = {textContent:''};
    const root = {hasAttribute:(name:string) => visualiser && name === 'data-cuk-visualiser',querySelector:(name:string) => name === '[data-cuk-fabric-grid]' ? grid : name === '[data-cuk-fabric-count]' ? count : null};
    (context.window as {__renderFabricCards:(root:unknown,catalog:unknown) => void}).__renderFabricCards(root,{fabrics:[fabric],total:100,page:1,pages:5});
    return {html:grid.cards[0].innerHTML,count:count.textContent};
  }
  const browse = render(false), visualiser = render(true);
  assert.match(browse.html, /Order sample/);
  assert.match(browse.html, /Vintage/);
  assert.match(browse.html, /135 cm usable width/);
  assert.match(browse.html, /100% Cotton/);
  assert.match(browse.html, /href="\/pages\/room-visualiser\?fabric=sdg-f1541-01"/);
  assert.match(browse.count, /100 fabrics · Page 1 of 5/);
  assert.doesNotMatch(visualiser.html, /Order sample|Vintage|usable width|100% Cotton/);
  assert.match(visualiser.html, /See in room/);
});

test('fabric selection uses the existing material switch without resetting room, palette, view or curtain progress', () => {
  const customer = readFileSync('lib/room-visualiser/runtime/rooms/customer-entry.mjs', 'utf8');
  const viewer = readFileSync('lib/room-visualiser/runtime/rooms/viewer.mjs', 'utf8');
  const selection = customer.slice(customer.indexOf('async function selectRecord('), customer.indexOf('window.visualiserCustomer='));
  const materialSwitch = viewer.slice(viewer.indexOf('async function setCatalogueFabric('), viewer.indexOf("document.querySelector('#rooms')"));
  assert.match(selection, /await api\.setCatalogueFabric\(record\)/);
  assert.match(materialSwitch, /await catalogue\.select\(record\)/);
  for (const reset of ['roomPalettes.set(', 'setRoom(', 'setView(', 'setProgress(', 'travel.scrub(', 'applyFixedView(']) {
    assert.equal(materialSwitch.includes(reset), false, `fabric switching must not call ${reset}`);
  }
});
