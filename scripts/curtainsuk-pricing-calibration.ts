import { runCurtainsMadeForFreeCalibration } from "../lib/decision-engine/calibration/curtainsmadeforfree";

const pounds = (amountMinor: number) => Number((amountMinor / 100).toFixed(2));

const rows = runCurtainsMadeForFreeCalibration().map((result) => ({
  id: result.benchmark.id,
  sizeCm: `${result.benchmark.coverageWidthCm}x${result.benchmark.finishedDropCm}`,
  heading: result.benchmark.heading,
  fabricWidths: result.fabricWidths,
  fabricMetres: result.fabricMetres,
  liningMetres: result.liningMetres,
  interliningMetres: result.interliningMetres,
  faceFabricCostNet: pounds(result.faceFabricCostNet.amountMinor),
  liningCostNet: pounds(result.liningAndInterliningCostNet.amountMinor),
  makeupCostNet: pounds(result.makeupCostNet.amountMinor),
  headingAdjustmentNet: pounds(result.headingAdjustmentNet.amountMinor),
  totalDirectCostNet: pounds(result.totalDirectCostNet.amountMinor),
  netSellingPrice: pounds(result.netSellingPrice.amountMinor),
  vat: pounds(result.vat.amountMinor),
  grossSellingPrice: pounds(result.grossSellingPrice.amountMinor),
  competitorGrossPrice: pounds(result.competitorGrossPrice.amountMinor),
  variance: pounds(result.variance.amountMinor),
  variancePercent: Number(result.variancePercent.toFixed(2)),
  netGrossProfit: pounds(result.netGrossProfit.amountMinor),
  grossMarginPercent: Number(result.grossMarginPercent.toFixed(2)),
}));

console.table(rows);
