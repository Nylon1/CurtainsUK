import test from 'node:test';
import assert from 'node:assert/strict';
import { calibrationEligibility, calibrationRequestContext, currentCalibrationFabric } from '../hci-calibration';
import type { FabricMasterRecord } from '../../fabric-master/types';

const offered={fabricMasterId:'pt-1223-374',supplierSku:'1223/374',brand:'old',design:'old',colourway:'old',imageUrl:'https://cdn.shopify.com/old.jpg'};
const record={fabric_id:offered.fabricMasterId,supplier_sku:offered.supplierSku,supplier_id:'prestigious-textiles',
  brand_name:'Prestigious Textiles',design_name:'Dunbar',colour_name:'Gemstone',lifecycle_state:'CURRENT',
  staging_catalog_visible:true,imagery:['https://cdn.shopify.com/current.jpg']} as FabricMasterRecord;

test('new sessions opt in; legacy sessions remain replayable; only selection creation loads eligibility',()=>{
  assert.equal(calibrationRequestContext(null).policy,'brief-calibration-v2');
  assert.equal(calibrationRequestContext({tasteAnswers:[]}).policy,undefined);
  assert.equal(calibrationRequestContext({calibrationPolicy:'brief-calibration-v2',tasteAnswers:[1,2]}, {type:'answer'}).needsEligibility,false);
  assert.equal(calibrationRequestContext({calibrationPolicy:'brief-calibration-v2',tasteAnswers:[1,2,3]}, {type:'price-level'}).needsEligibility,true);
  assert.equal(calibrationRequestContext({calibrationPolicy:'brief-calibration-v2',tasteAnswers:[1,2,3],calibrationSelection:{}}, {type:'calibrate'}).needsEligibility,false);
});
test('existing recommendation eligibility governs calibration, without inventing purchasing/stock readiness',()=>{
  assert.deepEqual(calibrationEligibility([record,{...record,fabric_id:'retired',lifecycle_state:'DISCONTINUED'},
    {...record,fabric_id:'hidden',staging_catalog_visible:false},{...record,fabric_id:'no-image',imagery:[]}]),[record.fabric_id]);
});
test('current exact identity and imagery are checked for calibration resume/retry',()=>{
  const current=currentCalibrationFabric(offered,[record]);
  assert.equal(current.design,'Dunbar'); assert.equal(current.imageUrl,record.imagery[0]);
  assert.throws(()=>currentCalibrationFabric(offered,[]),/UNAVAILABLE/);
  assert.throws(()=>currentCalibrationFabric(offered,[{...record,supplier_sku:'different'}]),/UNAVAILABLE/);
  assert.throws(()=>currentCalibrationFabric(offered,[{...record,lifecycle_state:'DISCONTINUED'}]),/UNAVAILABLE/);
  assert.throws(()=>currentCalibrationFabric(offered,[{...record,imagery:['https://invalid.example/a.jpg']}]),/IMAGE_UNAVAILABLE/);
});
