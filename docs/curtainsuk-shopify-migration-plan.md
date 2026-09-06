# CurtainsUK Shopify migration plan

This is a planned projection of the Phase 1 domain model. It has not been applied
to either the live store or a development store.

## Recommended ownership and access

| Domain aggregate | Shopify projection | Access |
| --- | --- | --- |
| Window Type Master | `curtainsuk_window_type` metaobject | Public read for approved customer guidance |
| FabricSpec public attributes | `curtainsuk_fabric_spec` metaobject | Public read after supplier validation |
| Supplier cost and margin inputs | App-owned metafields or application database | Private server/admin only |
| Pricing / Manufacturing Rules | `curtainsuk_pricing_rule_set` metaobject plus application validation | Private server/admin only |
| CurtainConfiguration | Application database with revision history | Private; expose only a customer-owned view |
| Order configuration snapshot | Order metafields | Admin/customer-order view as appropriate |
| Project photographs/drawings | Private object storage with signed URLs | Customer/project team only |

Supplier cost must not be placed in a storefront-readable FabricSpec definition.
The logical aggregate should be projected into public merchandising data and
private commercial data.

## Metaobject definitions

### `curtainsuk_window_type`

Use typed fields for canonical name, slug, family, description, aliases, geometry,
required/optional measurements, headings, linings, tracks, pair/single choices,
photo/drawing/review flags, instant-pricing flag, complexity, related-window
references, SEO title/description, search intent and FAQs.

The measurement requirement arrays can initially be stored as validated JSON.
If non-technical staff need to edit individual measurement definitions regularly,
promote them into a separate referenced `curtainsuk_measurement_definition`
metaobject later.

### `curtainsuk_fabric_spec`

Use one entry per design/colour and store supplier, collection, design, colour,
supplier reference, SKU, usable width, repeats, match type, composition, care,
usage, sample availability/public price, lead time, status, images, allowed options,
window-type references and feed eligibility.

Store supplier cost, internal margin and unpublished selling inputs separately in
private app-owned data.

### `curtainsuk_pricing_rule_set`

Use discrete indexed fields for rule ID, semantic version, status, effective from,
effective to and superseded version. Store the validated nested rule payload as
JSON. The application must verify its schema and a content hash before activation.

Only the server-side pricing service may read commercial pricing rules. Do not
expose this definition through the Storefront API.

## Product and variant metafields

Planned product/variant references:

- `curtainsuk.fabric_spec` — metaobject reference from the real colour variant.
- `curtainsuk.configuration_enabled` — boolean launch gate.
- `curtainsuk.allowed_window_types` — list of window-type references.
- `curtainsuk.default_pricing_rule_family` — non-sensitive rule-family identifier.
- `curtainsuk.google_feed_eligible` — explicit publication gate.
- `curtainsuk.supplier_sku` — unique operational reference where appropriate.

Do not represent prices as customer-facing `Price` variants. Real variants should
represent real choices such as colour or sample format.

## Configuration and order snapshot

The application database should retain every configuration revision, calculation
input, calculation result, technical decision and approval event. On conversion,
write a compact immutable snapshot to order metafields:

- `curtainsuk.configuration_ids`
- `curtainsuk.calculation_versions`
- `curtainsuk.configuration_summary_json`
- `curtainsuk.technical_review_state`
- `curtainsuk.customer_approval_revision`
- `curtainsuk.production_state`

Never place unrestricted private photo URLs in line-item properties or public
metafields.

## Migration stages

1. Deploy definitions to a dedicated Shopify development store only.
2. Load the 21 Window Type Master seeds and validate all references.
3. Load the two synthetic fabric fixtures with feed publication disabled.
4. Load the draft pricing-rule record; confirm that it cannot become ACTIVE while
   commercial inputs are null.
5. Exercise read-only application queries and access-control tests.
6. Agree the commercial decision register and create an approved rules version.
7. Map a small hand-verified pilot set of real products/colours without publishing
   it to Google or the live Online Store.
8. Export and reconcile the pilot, then obtain business and technical sign-off.
9. Schedule a separately approved production migration with backups, dry-run output,
   rollback criteria and publication gates.

No live data should be written during Phases 1–8.
