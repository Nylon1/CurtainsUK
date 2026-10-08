# Fixed140 V1 Browse-owned tranche preparation

This is an unpublished, read-only preparation workflow. The active
`curtainsuk_private.browse_read_projection` generation defines the only
candidate universe. Fabric Master tables hydrate width, repeat and approved
MAIN source facts **after** a Browse ID has been selected. The frozen
`FIXED140_SINGLE_WIDTH_V1` renderer and existing STANDARD renderer are never
modified by these scripts.

For Tranche 3, save the active Browse generation, all distinct Browse IDs, and
the subset of those IDs with a published H or V repeat into private evidence.
The latter is a V1 technical eligibility filter, not a second catalogue.
Record the exact row count and hashes. Then select:

```text
node scripts/room-visualiser-fixed140-tranche/select-tranche-3.mjs
  --browse-dir <private-evidence-dir>
  --repeat-dir <private-evidence-dir>
  --previous <private-tranche-1-snapshot.jsonl>
  --previous <private-tranche-2-snapshot.jsonl>
  --generation <active-browse-generation>
  --output <private-selected-browse-ids.jsonl>
```

Pass one `--previous` per earlier tranche. The selector subtracts both live
renderer manifests and every previously processed V1 ID, including held
items. It takes the first 1,000 eligible IDs
under a stable code-point ordering. Hydrate source facts only for those exact
IDs, retaining the Browse generation and candidate order, then reconcile:

```text
node scripts/room-visualiser-fixed140-tranche/hydrate-tranche-3.mjs
  --selected <private-selected-browse-ids.jsonl>
  --raw-dir <private-evidence-dir>
  --output <private-catalogue-snapshot.jsonl>
node scripts/room-visualiser-fixed140-tranche/process.mjs
  --snapshot <private-catalogue-snapshot.jsonl>
  --browse-dir <private-evidence-dir>
  --output <private-evidence-dir>
  --limit 1000 --stop-after 1000 --batch-size 250
```

The append-only `ledger.jsonl` and atomic `checkpoint.json` resume at the
first incomplete item and reject a changed snapshot or renderer manifest.
`prepared-assets` contains exact hash-addressed supplier bytes, without
resizing. Audit source quality, inspect contact sheets, document any source
review decisions, finalize, and capture 24–30 varied Room/Curtain/Full Curtain
fixtures. The resulting `proposed-assignments.jsonl` is private review
evidence, not production eligibility.

Before any later publication PR, query the **live active Browse projection
again**. Every proposed assignment must still be present. Drop disappeared
IDs; replacement requires a complete V1 assessment, otherwise publish a
smaller approved set. Never use Fabric Master existence as an override.
