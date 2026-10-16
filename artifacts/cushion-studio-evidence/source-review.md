# Cushion Studio source evidence — 14 October 2026

This is a bounded read-only observation, not a fresh commercial quotation or a supplier order. The exact request URL and UTC observation time for each record are in `source-records.json`. The downloaded original approved MAIN images have SHA-256 hashes in that record and the dedicated configuration evidence file. No catalogue, supplier, theme or hosted database record was changed.

## Owner decisions

- The full active fabric range is suitable for cushions; normal lifecycle, stock and commercial controls remain.
- On 14 October the owner confirmed: “All fabrics are scaled for I width x 1 meter length”. Cushion Studio interprets this as one complete recorded fabric width horizontally and 1000 mm vertically for the original fabric image. It is owner-confirmed calibration, not a newly performed physical measurement.
- This confirmation does not change the separately processed curtain visualiser derivatives, which have their own physical coverage and provenance. It does not assert that an arbitrary photograph tiles seamlessly.
- Both cushion faces must look identical: same pattern, position and upright orientation, with linked placement edits. Same fabric alone is insufficient.
- The Configurator and the furniture Layout are two separate experiences, in that sequence.

## Real first-milestone candidates

| Fabric identity | Fabric | Full width | Vertical / horizontal repeat | Recorded match | Observation |
| --- | --- | --- | --- | --- | --- |
| `sdg-f1239-30` | Clarke & Clarke Amalfi Herb | 1370 mm | 0 / 0 mm | null | Plain control; both repeats explicitly zero; visually inspect before any weave-scale claim. |
| `sdg-dstr237715` | Sanderson Sabu Stripe Stone/Oak | 1415 mm | 85 / 50 mm | STRAIGHT_MATCH | Original downloaded image visually inspected: vertical stripes and offset small light marks. Preserve both repeat dimensions. |
| `sdg-dmlf236846` | Morris & Co. Bird Weave Brick | 1375 mm | 460 / 345 mm | STRAIGHT_MATCH | Original downloaded image visually inspected: upright birds and foliage; useful directional-pattern control. |
| `sdg-mind237581` | Morris & Co. Bird & Anemone Weave Apricot/Linen | 1380 mm | 780 / 320 mm | STRAIGHT_MATCH | Larger-repeat alternative; image downloaded but not yet visually reviewed. |

All four public records reported price-ready, current-stock-confirmed and curtain-order-ready when observed. Those are inherited curtain/readiness facts, not proof of cushion purchase readiness. Supplier costs, minimum cuts, purchase increments, shipping and cushion additional rates are not present in this public snapshot and were not invented.

The dedicated evidence configuration references these four images for traceable demonstrations; it must not restrict the full active fabric catalogue's discovery. Other original MAIN images can use the owner's calibration rule when their source identity and full fabric width are available. Missing or conflicting evidence needs an explicit state.

## Access and scope

Existing signed Shopify public catalogue detail worked at `/apps/curtainsuk-decision/catalog?view=retail&fabric=<id>`. Search for `bird` worked with `view=retail&browseGuide=1&query=bird`; the ordinary search without `browseGuide=1` returned “Unable to load the fabric catalogue”. Record that integration observation without modifying the unrelated existing catalogue during this evidence task.

The Supabase connector denied the attempted read-only metadata query. No alternative privileged database access was attempted in this evidence task. Public governed fabric reads supplied the facts above. No private supplier price was captured or exposed.

No physical sample measurement, physical iPhone check, spoken VoiceOver check, production quotation, Shopify order or workroom release was performed for this record.
# Additional implementation evidence

- New furniture/cushion geometry is procedurally authored in the Cushion Studio runtime. No external sofa configurator or third-party furniture model was adopted.
- Rendering reuses the repository's existing Three.js vendor files, whose headers identify the MIT licence; the full notice is at `lib/room-visualiser/runtime/vendor/LICENSE.txt`. Keep this notice with the served/released assets.
- Shopify's current [app proxy authentication documentation](https://shopify.dev/docs/apps/build/online-store/app-proxies/authenticate-app-proxies), checked 14 October 2026, confirms signed customer identity parameters and that Cookie/Set-Cookie headers are stripped. Hosted save ownership must not rely on proxy cookies.
