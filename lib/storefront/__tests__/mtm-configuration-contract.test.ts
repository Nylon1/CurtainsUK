import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { buildShopifyCatalogPayload } from '../shopify-contract';
import { automatedMtmWindow, mtmConfigurationContract } from '../mtm-configuration-contract';
import { AUTOMATED_MTM_WINDOW_SLUGS } from '../mtm-production-policy';
import { prepareStagingConfiguration, type StagingPriceRequest } from '../staging-pricing';
import { calculateProductionMtmPriceForRehearsal } from '../production-pricing';
import { STOREFRONT_FABRICS_BY_ID } from '../fabrics';
import { priceRejectionDetails } from '../price-rejection';
import { priceDiagnosticContext, parsePriceDiagnosticContext } from '../price-diagnostics';

const source = readFileSync('shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-mtm-configurator.js', 'utf8');
const context: any = { window: {}, document: { createElement: () => ({ value: '', textContent: '' }) } };
runInNewContext(source, context);
const ui = context.window.CurtainsUKMtmConfigurator;
const windows = buildShopifyCatalogPayload().windows;
const fabric = { ...[...STOREFRONT_FABRICS_BY_ID.values()][0], supplierCostPerMetre: { amountMinor: 1000, currency: 'GBP' as const }, supplierCostEffectiveFrom: '2026-09-20' };
const state = (windowSlug = 'standard-window'): StagingPriceRequest => ({ windowSlug, measurementBasis: 'TRACK_WIDTH', hardware: 'TRACK',
  widthCm: 180, dropCm: 220, fabricId: fabric.id, heading: 'PENCIL_PLEAT', lining: 'STANDARD', construction: 'PAIR', stackDirection: 'SPLIT' });
const plain = (value: unknown) => JSON.parse(JSON.stringify(value));

for (const slug of AUTOMATED_MTM_WINDOW_SLUGS) {
  test(`${slug}: every UI construction on every hardware/heading route validates and prices`, () => {
    const entry = windows.find(w => w.slug === slug)!;
    const master = automatedMtmWindow(slug).windowType;
    assert.deepEqual(entry.configuration, mtmConfigurationContract(slug));
    const hardware = new Set(entry.configuration!.routes.map(route => route.hardware));
    assert.deepEqual([...hardware], slug === 'bay-window' ? ['TRACK'] : ['TRACK', 'POLE']);
    for (const route of entry.configuration!.routes) {
      assert.deepEqual(route.constructions.map(choice => choice.value), master.pairSingleAvailability);
      for (const choice of route.constructions) {
        for (const stackDirection of choice.stackDirections) {
          const request = { ...state(slug), hardware: route.hardware, measurementBasis: route.measurementBasis, heading: route.heading, construction: choice.value, stackDirection };
          assert.equal(ui.validate(entry, request), null);
          assert.equal(prepareStagingConfiguration(request, fabric).windowType, master);
          assert.ok(calculateProductionMtmPriceForRehearsal(request, fabric).total.amountMinor > 0);
        }
      }
      for (const construction of ['', 'INVALID']) {
        const request = { ...state(slug), ...route, construction } as unknown as StagingPriceRequest;
        assert.equal(ui.validate(entry, request)?.field, 'construction');
        assert.throws(() => prepareStagingConfiguration(request, fabric), error => priceRejectionDetails(error)?.diagnosticCode === 'CONFIGURATION_CONSTRUCTION_NOT_ALLOWED');
      }
    }
  });
}

test('canonical master restrictions immediately change both UI and backend without a second allowlist', () => {
  const master = automatedMtmWindow('bay-window').windowType;
  const previous = master.pairSingleAvailability;
  try {
    master.pairSingleAvailability = ['SINGLE'];
    const entry = buildShopifyCatalogPayload().windows.find(w => w.slug === 'bay-window')!;
    assert.deepEqual(entry.configuration!.routes[0].constructions.map(c => c.value), ['SINGLE']);
    const reconciled = ui.reconcile(entry, state('bay-window'));
    assert.equal(reconciled.construction, 'SINGLE');
    assert.equal(reconciled.stackDirection, '');
    assert.equal(ui.validate(entry, state('bay-window')).field, 'construction');
    assert.throws(() => prepareStagingConfiguration(state('bay-window'), fabric), error => priceRejectionDetails(error)?.diagnosticCode === 'CONFIGURATION_CONSTRUCTION_NOT_ALLOWED');
  } finally { master.pairSingleAvailability = previous; }
});

test('hardware/window changes reconcile heading, construction and stack; missing contract fails closed', () => {
  const standard = windows.find(w => w.slug === 'standard-window')!;
  const bay = windows.find(w => w.slug === 'bay-window')!;
  assert.equal(ui.reconcile(standard, { ...state(), measurementBasis: 'POLE_USABLE_WIDTH', heading: 'WAVE' }).heading, 'PENCIL_PLEAT');
  const bayState = ui.reconcile(bay, { ...state(), windowSlug: 'bay-window', measurementBasis: 'POLE_USABLE_WIDTH', heading: 'EYELET' });
  assert.equal(bayState.measurementBasis, 'TRACK_WIDTH');
  assert.equal(bayState.heading, 'PENCIL_PLEAT');
  assert.equal(ui.reconcile(standard, { ...state(), construction: 'SINGLE' }).stackDirection, '');
  assert.equal(ui.reconcile(standard, { ...state(), stackDirection: 'LEFT' }).stackDirection, 'SPLIT');
  assert.equal(ui.validate({ ...standard, configuration: null }, state()).field, 'windowSlug');
  assert.equal(ui.reconcile(null, state()).construction, '');
});

test('backend rejects incoherent pair/single openings without changing allowed constructions', () => {
  for (const request of [{ ...state(), stackDirection: 'LEFT' }, { ...state(), construction: 'SINGLE' }]) {
    assert.throws(() => prepareStagingConfiguration(request as StagingPriceRequest, fabric), error => priceRejectionDetails(error)?.diagnosticCode === 'CONFIGURATION_STACK_DIRECTION_NOT_ALLOWED');
  }
});

test('all active inputs are checked even while the wizard makes hidden fields optional', () => {
  const entry = windows.find(w => w.slug === 'standard-window')!;
  for (const field of ['widthCm', 'dropCm', 'construction', 'stackDirection', 'heading', 'fabricId', 'lining', 'measurementBasis']) {
    assert.equal(ui.validate(entry, { ...state(), [field]: '' }).field, field);
  }
  for (const value of [undefined, null, '', ' ', 0, -1, NaN, Infinity, 'garbage', 29, 1201]) {
    assert.equal(ui.validate(entry, { ...state(), widthCm: value }).field, 'widthCm');
  }
  assert.equal(ui.validate(entry, { ...state(), widthCm: 30, dropCm: 30 }), null);
  assert.equal(ui.validate(entry, { ...state(), widthCm: 999.9, dropCm: 600 }), null);
  assert.equal(ui.validate(entry, { ...state(), widthCm: 1000 }).field, 'widthCm');
});

test('known invalid arrangements and repeated automatic input cannot create a price loop', () => {
  const gate = ui.createRequestGate();
  const request = state();
  assert.equal(gate.canSubmit(request, true), true);
  gate.start(request);
  assert.equal(gate.canSubmit({ ...request, dropCm: 221 }, true), false);
  gate.reject(request, 'CONFIGURATION_CONSTRUCTION_NOT_ALLOWED', ui.arrangementMessage);
  gate.finish();
  for (let i = 0; i < 10; i++) {
    assert.equal(gate.canSubmit({ ...request, dropCm: 221 + i }, true), false);
    assert.equal(gate.canSubmit(request, false), false);
  }
  const different = { ...request, construction: 'SINGLE', stackDirection: 'LEFT' };
  assert.equal(gate.canSubmit(different, true), true);
  gate.start(different); gate.finish();
  assert.equal(gate.canSubmit(different, true), false);
  assert.equal(gate.canSubmit(different, false), true);
});

test('construction errors have specific bounded copy and diagnostics exclude raw fields', () => {
  let rejection;
  try { prepareStagingConfiguration({ ...state(), construction: '' } as unknown as StagingPriceRequest, fabric); }
  catch (error) { rejection = priceRejectionDetails(error); }
  assert.equal(rejection?.customerMessage, ui.arrangementMessage);
  const diagnostic = priceDiagnosticContext({ ...state(), construction: '', widthCm: 123.456, dropCm: 321.987, customerName: 'Private Name', token: 'secret', fabricSupplierCost: 123 }, ui.release, 'dpl_TestDeployment');
  assert.equal(diagnostic.construction, 'UNSELECTED');
  assert.deepEqual(parsePriceDiagnosticContext(diagnostic), diagnostic);
  assert.doesNotMatch(JSON.stringify(diagnostic), /123|321|Private|secret|fabric|width|drop/);
  assert.equal(parsePriceDiagnosticContext({ ...diagnostic, widthCm: 123 }), null);
  assert.equal(parsePriceDiagnosticContext({ ...diagnostic, construction: 'private@example.com' }), null);
  assert.equal(priceDiagnosticContext({ construction: 'secret' }, 'token', 'token').construction, 'UNRECOGNISED');
});

test('rendered options remove stale choices rather than leaving an invalid option selected', () => {
  const entry = windows.find(w => w.slug === 'standard-window')!;
  const fields: any = Object.fromEntries(Object.entries(state()).map(([name, value]) => [name, { value, options: [] as any[], replaceChildren(...options: any[]) { this.options = options; } }]));
  const form = { elements: fields };
  fields.construction.value = 'SINGLE';
  ui.sync(form, entry);
  assert.deepEqual(plain(fields.stackDirection.options.map((o: any) => o.value)), ['', 'LEFT', 'RIGHT']);
  assert.equal(fields.stackDirection.value, '');
  fields.stackDirection.value = 'RIGHT'; fields.construction.value = 'PAIR';
  ui.sync(form, entry);
  assert.deepEqual(plain(fields.stackDirection.options.map((o: any) => o.value)), ['', 'SPLIT']);
  assert.equal(fields.stackDirection.value, 'SPLIT');
});
