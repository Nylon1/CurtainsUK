# Room Visualiser publication line

`pipeline.mjs` is the one entrypoint for an offline batch. Its queue joins the
existing catalogue evidence and is **not** a second fabric database. Each row
is classified as colour-led plain, approved straight repeat, or HOLD. Half-drop,
offset, uncertain scale, missing/changed source imagery, and unapproved cloth
joins stay on HOLD with a reason. A single failure does not abort neighbouring
fabrics. The current retailer projection is checked immediately before staging.

The pipeline creates the approved 2048 × 1113 WebP, checks source and master
hashes, physical repeat arithmetic for patterned entries, encoded asset hashes,
mesh invariants and the room pack. Runtime derivatives use immutable
`/room-visualiser/textures/<sha256>.webp` URLs outside the versioned room pack.
The original supplier image and internal jigsaw master are never altered or
loaded by the customer request. Existing Shopify Browse/Profile buttons use
the same retail `roomPreview` projection after the manifest reaches production;
no Shopify theme or fabric-record write is part of this line.

Run from a branch based on current `release/production`:

```text
node scripts/room-visualiser-publication/pipeline.mjs --stage --queue <read-only-evidence.jsonl> --ledger <private-ledger.json> --report-dir <private-report-dir> --batch-size 25
```

The command runs classification, build, validation, tests, TypeScript and the
production build. A failure leaves the staged batch pending for repair and
`--resume-staged`. The ledger records IDs already live and IDs in the pending
protected release. Do not initialize a ledger from a manifest that includes
unreleased entries. Review the contact sheet and the held reasons before the
small protected PR. Release the exact staged manifest/assets through the normal
green-check merge and real production deployment; wait for READY.

Then run the **same entrypoint** with `--verify-live` and the same queue/ledger.
It checks each pending ID against the public retail projection and CDN bytes,
hash, MIME and immutable cache header. It promotes only passing IDs in the
ledger. Any live fault blocks another batch. Subsequent batches may use 50,
but must start from the new protected HEAD. The high-resolution masters and
audit exports remain private; reports and ledgers are outside the repository.

The first straight-repeat batch may use only an explicit visual decision bound
to its exact master hash. Selecting a master in an experiment is not sufficient
to grant visualiser eligibility. No half-drop renderer is enabled here.
