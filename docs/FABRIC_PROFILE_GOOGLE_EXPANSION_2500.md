# Google Fabric Discovery expansion to 2,500 profiles

## Scope

This runbook preserves the current CurtainsUK production authority and expands the existing Google Fabric Discovery cohort without changing Fabric Intelligence migrations, pricing, stock, sample checkout, Naila, HCI policy or curtain checkout.

The intended result is:

- refresh the existing Fabric Discovery profiles from the enriched Fabric Intelligence source;
- refresh `supplier_facts` from current Fabric Master, including usage and care where governed supplier data exists;
- add 2,000 further app-owned Fabric Discovery metaobjects;
- keep the existing £2.50 physical sample offer and exact Fabric Master identity;
- expose richer Product structured data from the existing visible profile information.

## Existing profile refresh

Dry-run:

```bash
npm run fabric:profiles:refresh
```

The existing reconciler:

- authenticates only as `curtains-uk-mtm`;
- accepts only `carpetup.myshopify.com`;
- verifies the exact live `$app:fabric_discovery` definition;
- reads `fabric_visual_knowledge_enriched` first and falls back only if the enriched relation is missing;
- never clears a known intelligence field because a newer governed value is unknown;
- never downgrades a published COMPLETE profile to PARTIAL;
- refreshes `supplier_facts` only from Fabric Master;
- does not write identity, URL, sample price, stock, curtain price or checkout fields.

Recommended apply sequence remains one exact fabric, then a bounded group, then the whole existing cohort:

```bash
npm run fabric:profiles:refresh -- --fabric=<fabric-master-id> --apply --confirm-shopify-only
npm run fabric:profiles:refresh -- --limit=10 --apply --confirm-shopify-only
npm run fabric:profiles:refresh -- --apply --confirm-shopify-only
```

## Add 2,000 new profiles

First run a dry-run:

```bash
npm run fabric:profiles:expand -- --add=2000
```

The dry-run prints a `selectionRevision`. Save that exact value.

Selection fails closed and requires:

- fabric is not already represented by an existing Fabric Discovery profile;
- current Fabric Master storefront eligibility;
- current Browse sample eligibility;
- a Shopify CDN fabric image;
- governed COMPLETE or PARTIAL_GOVERNED Fabric Intelligence;
- concrete pattern intelligence plus at least three supporting visual dimensions (colour, activity, surface, finish, presence or character); exact manufacturer colourway remains present even when visual primary colour is unavailable;
- deterministic handle and canonical URL generation;
- every required field in the live metaobject definition to be present.

COMPLETE candidates are preferred before PARTIAL candidates. Within each state, order is deterministic from Fabric Master ID so repeated dry-runs against unchanged production state produce the same selection.

Apply only with the exact dry-run revision:

```bash
npm run fabric:profiles:expand -- --add=2000 --apply --confirm-shopify-only --expected-selection=<selectionRevision>
```

If the current eligible set changes between dry-run and apply, the runner aborts before creating profiles.

Writes use bounded concurrency with Shopify throttle retry and per-profile read-back verification. After apply, the runner reloads the live profile set and proves that every selected Fabric Master identity exists.

## Structured commerce enrichment

The Fabric Discovery theme section now builds the Product JSON-LD description from information already visible on the profile:

- brand, design and colourway;
- full Fabric Intelligence colour palette;
- pattern and motif;
- surface/texture;
- finish;
- visual presence;
- interior character;
- supplier usage when present;
- exact physical sample offer.

Structured Product properties also expose pattern and composition/material when governed data is available.

This does not create duplicate SEO pages and does not replace the visible Fabric Profile experience. One canonical URL remains tied to one Fabric Master identity.

## Release boundary

This code change does not itself:

- publish the live Shopify MAIN theme;
- create any profile until the explicit expansion apply command is run;
- submit Merchant Center items directly;
- alter Supabase schema or migrations;
- alter Fabric Intelligence observations;
- alter prices, stock or sample checkout.

The live theme structured-data improvement must be published through the normal reviewed Shopify theme path after source validation.

## Post-apply checks

After expansion:

1. verify live Fabric Discovery profile count increased by at least 2,000 from the pre-run count;
2. verify a COMPLETE and PARTIAL new profile both render identity, image, £2.50 sample, FI and supplier facts;
3. verify existing profiles retained their canonical URLs and Fabric Master IDs;
4. verify Browse remains prepared and clean;
5. verify sample checkout still resolves the exact Fabric Master identity;
6. verify Product structured data on several profiles contains the richer description, pattern and material where available;
7. monitor Merchant Center approval/indexing and Search Console query coverage before considering another scale step.
