import assert from 'node:assert/strict';
import test from 'node:test';
import { hasSampleToSaleRole } from '../sample-to-sale-authz';
import { hasSupplierAdminRole } from '../../supplier-intelligence/authz';

test('the sample pilot role permits only the sample pilot, not supplier administration', () => {
  const owner = { roles: ['CURTAINSUK_ERROR_CENTRE_VIEWER', 'CURTAINSUK_SAMPLE_TO_SALE_MANAGER'] };
  assert.equal(hasSampleToSaleRole(owner), true);
  assert.equal(hasSupplierAdminRole(owner), false);
  assert.equal(hasSampleToSaleRole({ roles: ['CURTAINSUK_ERROR_CENTRE_VIEWER'] }), false);
  assert.equal(hasSampleToSaleRole({ roles: ['SUPPLIER_ADMIN'] }), true);
  assert.equal(hasSampleToSaleRole(null), false);
});
