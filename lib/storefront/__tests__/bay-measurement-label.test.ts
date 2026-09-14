import test from 'node:test';
import assert from 'node:assert/strict';
import { customerMeasurementSummary } from '../shopify-draft-order-core';

test('Bay section counts are unitless while section widths retain centimetres', () => {
  const summary = customerMeasurementSummary({number_of_sections:3,bay_segment_widths:[80,140,80],finished_drop:210});
  assert.match(summary,/Number Of Sections: 3(?:;|$)/);
  assert.doesNotMatch(summary,/Number Of Sections: 3 cm/);
  assert.match(summary,/Bay Segment Widths: 80 cm \/ 140 cm \/ 80 cm/);
  assert.match(summary,/Finished Drop: 210 cm/);
});
