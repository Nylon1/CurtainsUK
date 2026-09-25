import test from 'node:test';
import assert from 'node:assert/strict';
import { browseSearchRpcName } from '../browse-rpc';

test('Browse projection is opt-in and never changes commerce RPCs', () => {
  assert.equal(browseSearchRpcName(undefined), 'search_retail_fabrics');
  assert.equal(browseSearchRpcName('disabled'), 'search_retail_fabrics');
  assert.equal(browseSearchRpcName('enabled'), 'search_retail_fabrics_prepared_v1');
});
