# Standard square visual review - 14 October 2026

Local candidate only, reviewed at http://127.0.0.1:4357/cushion-studio-preview/.

## Reproduce the two demonstrations

1. Open the **Pattern, in balance** guide. Select cushion 1 in the Configurator, standard Square, 50 x 50 cm, Cover & filling, Unpiped. Fabric is **Bird & Anemone Weave - Apricot/Linen**, `sdg-mind237581`, from the original calibrated catalogue MAIN image. Linked pattern placement is the guide default. Inspect front/back to compare upright artwork.
2. Open **2. Sofa layout**, select **Two-seat sofa** and **The details**. The same 50 cm square is behind the existing **Sabu Stripe - Stone/Oak**, `sdg-dstr237715`, 38 x 50 cm rectangle. Oat upholstery, Stone walls and Natural oak floor. The rectangle geometry is unchanged.

- `square-50-configurator.jpg`: isolated standard square with pinched sewn edge, proud corners and fuller centre.
- `square-50-two-seat-sofa.jpg`: backrest lean and seat contact in the two-seat arrangement.

The selected real fabric remains the only surface artwork. The owner photograph is a visual construction reference only, not bundled artwork. No CGTrader asset was adopted. Parent review independently confirmed the improved silhouette, upright front/back equality and sofa contact. Additional plain Amalfi preview exposed no dark normal artifacts. Browser warning/error log was empty on the reviewed tab.

## Verification and limits

`npm run test:cushions`: 60/60 pass. Runtime tests cover the full finished corner spans of all five standard sizes, inward edges, thin shared seam, central material scale, outward face equality, bounded contact after lean/rotation, backrest clearance and unchanged non-square equations. Decorative bed squares remain on the prior geometry path. The deformation is an illustrative drape, not a physical filling simulation; actual sewn shape varies with filling and fabric. No pricing, cutting specification, production flag or hosted resource changed.
