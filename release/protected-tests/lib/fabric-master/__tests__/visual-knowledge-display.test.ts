import '../../../scripts/curtainsuk-server-script-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapVisualKnowledgeRow, customerIntelligence } from '../visual-knowledge';

test('complete stored reading retains colour, pattern and character without modifying evidence', () => {
  const row = {fabric_id:'pt-1223-374',knowledge_state:'COMPLETE',visual_fields:{
    primaryColour:{value:'black'},secondaryColours:{value:['gold','red']},
    colourTemperature:{value:'warm'},patternClass:{value:'stripe'},character:{value:['graphic']},
  }};
  const before = JSON.stringify(row);
  const result = mapVisualKnowledgeRow(row);
  assert.equal(result.palette?.primary,'black');
  assert.equal(result.palette?.temperature,'warm');
  assert.equal(result.pattern?.category,'stripe');
  assert.ok(customerIntelligence(result)?.dimensions.some(d=>d.key==='character'));
  assert.equal(JSON.stringify(row),before);
});

test('partial readings expose known dimensions while unknown colour is omitted', () => {
  const result=mapVisualKnowledgeRow({fabric_id:'pt-1204-212',knowledge_state:'PARTIAL_GOVERNED',visual_fields:{
    primaryColour:{value:'unknown'},patternClass:{value:'geometric'},visualSurface:{value:['visible-weave']},
  }});
  assert.equal(result.palette?.primary,undefined);
  assert.equal(result.pattern?.category,'geometric');
  assert.ok(customerIntelligence(result)?.dimensions.some(d=>d.key==='texture'));
  assert.ok(!customerIntelligence(result)?.dimensions.some(d=>d.key==='colour'));
});
