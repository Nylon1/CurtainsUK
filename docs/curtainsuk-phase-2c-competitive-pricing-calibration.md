# CurtainsUK Phase 2C — competitive pricing calibration

## Safety and status

This work changes only the framework-independent decision engine on the feature
branch. Pricing Ruleset v1 remains `DRAFT`; it is not connected to Shopify, the
storefront, checkout, catalogue, Merchant Center or any production runtime.

The earlier code did not contain an executable 60% target gross margin: the
margin/markup policy was unresolved. Phase 2C explicitly introduces the locked
40% target without pretending that an existing 60% value was replaced.

## Locked commercial model

- Face fabric: `FabricSpec.supplierCostPerMetre`, effective-dated and snapshotted.
- Standard lining: £4.00 net per metre.
- Blackout lining: £6.00 net per metre.
- Thermal lining: £6.00 net per metre.
- Interlining: £10.00 net per metre.
- Base make-up: £25.00 net per face-fabric width.
- Heading adjustment on make-up only: Pencil 1.00, Wave/Eyelet 1.10,
  Double/Triple Pinch 1.20.
- Net selling price: `total direct cost / (1 - 0.40)`.
- VAT: 20% calibration rate, retained as `DRAFT` pending finance confirmation.
- Final customer total: nearest whole pound; intermediate values are unrounded.
- Proposed minimum net gross-profit floor: £100, inactive. £150 remains an upper
  calibration candidate.

## Benchmark assumptions that remain draft

- Face fabric width 138 cm and straight-match vertical repeat 3.2 cm.
- Existing fullness defaults: Pencil/Wave 2.0 and Double Pinch 2.25.
- Separate top and bottom allowances: 15 cm and 20 cm.
- Pair construction rounds an odd calculated width count to an even balanced pair.
- Lining/interlining width 138 cm and the same 15/20 cm allowances.
- Base make-up includes lining construction labour; separate lining labour is £0.
- No separate pattern-matching labour, packaging charge, delivery or minimum-floor
  adjustment is included in the competitor comparison.
- The interlined benchmark includes both standard lining and interlining, matching
  the competitor option label “Interlined Cotton Sateen Ivory”.

## Engine results

All monetary values below are pounds. Direct costs, selling price, VAT and gross
profit are net unless the column explicitly says gross.

| Job | Size / heading / lining | Fabric m | Lining m | Interlining m | Face cost | Lining cost | Make-up | Heading adjustment | Direct cost | Net selling | VAT | Gross selling | Competitor | £ variance | % variance | Net gross profit | GM |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| CMFF-01 | 100×220, Pencil, Standard | 5.2 | 5.1 | 0 | 104.00 | 20.40 | 50.00 | 0.00 | 174.40 | 290.67 | 58.13 | **349** | 317.41 | +31.59 | +9.95% | 116.27 | 40% |
| CMFF-02 | 100×220, Wave, Blackout | 5.2 | 5.1 | 0 | 104.00 | 30.60 | 50.00 | 5.00 | 189.60 | 316.00 | 63.20 | **379** | 345.01 | +33.99 | +9.85% | 126.40 | 40% |
| CMFF-03 | 200×220, Wave, Blackout | 10.3 | 10.2 | 0 | 206.00 | 61.20 | 100.00 | 10.00 | 377.20 | 628.67 | 125.73 | **754** | 690.01 | +63.99 | +9.27% | 251.47 | 40% |
| CMFF-04 | 200×260, Double Pinch, Blackout | 12.0 | 11.8 | 0 | 240.00 | 70.80 | 100.00 | 20.00 | 430.80 | 718.00 | 143.60 | **862** | 859.39 | +2.61 | +0.30% | 287.20 | 40% |
| CMFF-05 | 300×260, Double Pinch, Standard + Interlining | 17.9 | 17.7 | 17.7 | 358.00 | 247.80 | 150.00 | 30.00 | 785.80 | 1,309.67 | 261.93 | **1,572** | 1,297.49 | +274.51 | +21.16% | 523.87 | 40% |

## Findings

The first four jobs land from 0.30% to 9.95% above the competitor, so the £25
make-up rate plus 40% target margin is a credible base without per-job tuning.
The engine reproduces all five observed competitor fabric-width counts; fullness
is therefore not the source of variance at these exact benchmark points.

The material assumptions dominate the remaining uncertainty. The first three
jobs are consistently about 9–10% high, compatible with differences in hidden
allowances, lining quantity or competitor margin. Pattern-repeat rounding is
small here: 255 cm becomes 256 cm and 295 cm becomes 297.6 cm before fabric-order
rounding.

CMFF-04 is effectively at parity, which supports the Pinch 1.20 adjustment on
make-up. CMFF-05 is the outlier because the model includes 17.7 m of standard
lining plus 17.7 m of interlining. Treating £10/m as a combined complete
interlined-lining package would reduce the model to about £1,430 gross, still
roughly 10.2% above the competitor; that alternative is not implemented because
it contradicts the current separate-material architecture.

The proposed £100 floor would not alter any benchmark because the lowest net
gross profit is £116.27. A £150 floor would increase the first two jobs and make
their competitor variance materially worse, so £100 is the better preliminary
candidate. It remains inactive until real CurtainsUK jobs are calibrated.

Do not adjust the 40% margin to solve CMFF-05. Confirm the interlined construction
bill of materials, lining usable width/allowances and whether the £25 make-up rate
fully covers interlined labour first.
