import assert from 'node:assert/strict';
import test from 'node:test';
import { DecisionEngineValidationError } from '../decision-engine/errors';
import { priceRejectionDetails } from './price-rejection';

test('price validation gives an actionable public message and bounded diagnostic code', () => {
  const rejection = priceRejectionDetails(new DecisionEngineValidationError(
    'Curtain configuration is incomplete or invalid',
    [{ code: 'SUSPICIOUS_MM_CM_INPUT', field: 'measurements.coverage_width', message: 'Value looks like millimetres' }],
  ));
  assert.deepEqual(rejection, {
    diagnosticCode: 'CONFIGURATION_SUSPICIOUS_MM_CM_INPUT',
    customerMessage: 'Please check that your measurements are in centimetres, not millimetres.',
  });
});

test('price validation never reflects unknown issue text or field names', () => {
  const rejection = priceRejectionDetails(new DecisionEngineValidationError(
    'Curtain configuration is incomplete or invalid',
    [{ code: 'UNRECOGNISED', field: 'customer@example.com', message: 'private customer value' }],
  ));
  assert.deepEqual(rejection, {
    diagnosticCode: 'CONFIGURATION_INVALID',
    customerMessage: 'Please check your measurements and curtain choices, then try again.',
  });
});

test('measurement basis mismatch identifies the choice without exposing measurements', () => {
  assert.deepEqual(priceRejectionDetails(new Error('MTM_HARDWARE_MEASUREMENT_BASIS_INCOMPATIBLE')), {
    diagnosticCode: 'MEASUREMENT_BASIS_INCOMPATIBLE',
    customerMessage: 'Choose whether your fitted hardware is a track or a pole, then check its width.',
  });
  assert.equal(priceRejectionDetails(new Error('unrelated')), null);
});
