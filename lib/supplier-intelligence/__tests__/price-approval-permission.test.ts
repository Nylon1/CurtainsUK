import assert from "node:assert/strict";
import test from "node:test";
import {hasSupplierAdminRole,hasSupplierPriceApprovalPermission,isPriceOnlyObservation,SUPPLIER_PRICE_APPROVAL_PERMISSION} from "../authz";
import {normalizeSupplierSnapshot} from "../../supplier-sync/normalize";
const metadata={roles:[],permissions:[SUPPLIER_PRICE_APPROVAL_PERMISSION]};
const price=normalizeSupplierSnapshot({supplier_id:"prestigious-textiles",supplier_sku:"9999/001",checked_at:"2026-09-25T00:00:00.000Z",cut_trade_price:"12.50",currency:"GBP",source:{type:"OTHER",name:"Test",reference:null}});
test("price approver does not inherit supplier administration or other roles",()=>{
  assert.equal(hasSupplierPriceApprovalPermission(metadata),true);
  assert.equal(hasSupplierAdminRole(metadata),false);
  assert.equal(hasSupplierPriceApprovalPermission({roles:["EDITOR"]}),false);
  assert.equal(hasSupplierPriceApprovalPermission({user_metadata:metadata}),false);
  assert.equal(hasSupplierAdminRole({roles:["SUPPLIER_ADMIN"]}),true);
  assert.equal(hasSupplierPriceApprovalPermission({roles:["SUPPLIER_ADMIN"]}),true);
});
test("price-only permission excludes mixed commercial observations",()=>{
  assert.equal(isPriceOnlyObservation(price),true);
  for(const delta of [{stock_unit:"METRE"},{aggregate_available_quantity:0},{sample_available:false},{lifecycle_state:"CURRENT" as const},{next_due_quantity:1},{next_due_date:"2026-10-01"},{batches:[{batch_reference:"test",batch_available_quantity:1,pieces:null}]}]) assert.equal(isPriceOnlyObservation({...price,...delta}),false);
  assert.equal(isPriceOnlyObservation({...price,cut_trade_price:null}),false);
  assert.equal(isPriceOnlyObservation(null),false);
});
