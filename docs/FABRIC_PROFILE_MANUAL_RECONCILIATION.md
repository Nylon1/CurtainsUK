# Fabric Profile manual reconciliation

## Purpose

Refresh the Fabric Intelligence fields on existing Shopify Fabric Discovery metaobjects from the governed CurtainsUK read cache without changing Supabase, the Shopify theme, profile identity, URLs, samples, prices, stock, checkout or Fabric Master.

This is deliberately manual. There is no trigger, cron, webhook or database listener.

## Safety boundary

Source of truth read:

- Supabase `fabric_visual_knowledge_read_cache`
- allowed states: `COMPLETE`, `PARTIAL_GOVERNED`

Shopify destination:

- existing metaobject type `app--340764327937--fabric_discovery`
- existing entries only
- no create, upsert or delete operation exists in the script

Writable fields are hard-allowlisted to:

- `knowledge_state`
- `knowledge_colour`
- `knowledge_pattern`
- `knowledge_activity`
- `knowledge_surface`
- `knowledge_finish`
- `knowledge_weight`
- `knowledge_character`
- `knowledge_advice`
- `sync_revision`

The script does not write to Supabase.

It will not clear a populated Shopify intelligence field simply because a newer governed reading is unknown, and it will not downgrade an already published `COMPLETE` profile to `PARTIAL`.

## Credentials and store guard

The script reuses the existing CurtainsUK Shopify app client credentials:

- `CURTAINSUK_SHOPIFY_CLIENT_ID`
- `CURTAINSUK_SHOPIFY_APP_SECRET`

It accepts only the production Shopify store `carpetup.myshopify.com`. The app must have `read_metaobjects` and `write_metaobjects`; missing scopes fail closed.

## Dry run

Dry run is the default:

```bash
npm run fabric:profiles:refresh
```

Optional single-fabric canary:

```bash
npm run fabric:profiles:refresh -- --fabric=pt-4259-247
```

Optional bounded audit:

```bash
npm run fabric:profiles:refresh -- --limit=10
```

The report includes the exact old → new field differences and always reports `databaseWrites: 0`.

## Apply

A live Shopify write requires both explicit flags:

```bash
npm run fabric:profiles:refresh -- --apply --confirm-shopify-only
```

Recommended manual sequence after a Fabric Intelligence recovery run:

1. Full dry run.
2. Review the changed profile count and field-level differences.
3. Apply one exact fabric with `--fabric=<fabric-master-id>`.
4. Open that existing Fabric Profile and verify its rendered intelligence.
5. Apply a bounded group with `--limit=10`.
6. Only then apply the remaining existing profiles.

## Quarterly operation

No automatic schedule is required. Run the dry-run reconciliation approximately once every three months, or after a deliberate bulk Fabric Intelligence recovery. Apply only after reviewing the dry-run output.

## Explicit non-goals

This tool does not:

- create Fabric Profile pages
- create Shopify metaobjects
- add Merchant Center items
- change sitemap or canonical URLs
- modify supplier facts
- modify sample products or variants
- modify prices, stock, checkout or Draft Orders
- change HCI or Naila
- deploy Vercel
- change Supabase schema, migrations, functions or data
- change the live Shopify theme
