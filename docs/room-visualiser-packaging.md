# Room Visualiser deployment packaging

Every production deployment must contain the released Room Visualiser assets, even when the change concerns another feature. On 14 October 2026 the production deployment omitted `public/room-visualiser` entirely. The signed Shopify page still pointed to the released bundle, so its entry module and dependencies returned cached 404 responses.

`npm run build` now runs `verifyReleasedVisualiserAssets()` before compilation. It checks the SHA-256 of every file in the recorded immutable packs and every STANDARD catalogue texture. Missing or altered files fail the build. FIXED140 supplier images remain in the existing Blob store behind the existing rewrite; the build does not download or regenerate supplier artwork. Their live hashes must be checked during release readback.

Package only the exact current protected HEAD, after its required checks have passed:

```powershell
node scripts/prepare-production-source.mjs C:/path/to/new-release-directory
```

This exports the complete Git tree, including paths absent from a sparse checkout, and preserves original bytes regardless of Windows line-ending settings. It refuses a stale HEAD, tracked changes or an existing output directory. It verifies the asset package and writes a separate receipt containing the source SHA and tree. Do not deploy a hand-picked source directory or regenerate a released hash URL.

Inspect the explicit existing Vercel project and run `vercel deploy --dry --json` from the export. Confirm the manifest files and catalogue textures are in the upload. Use the existing production environment and source-attestation settings, stage with `--prod --skip-domain`, and verify the exact deployed bytes and unsigned proxy denials before promotion. Preserve the active adviser gates and budgets when updating their approved source SHA. Never infer the deployed source from a Production label alone.

After promotion, verify the canonical production alias and both compatibility aliases, every released module/room asset and catalogue texture, then exercise the live Shopify page. STANDARD has Room and Curtain camera views; FIXED140 additionally has Full curtain view. Check the original four rooms and Bay Window, including four bay panels at open and closed positions, plus Daylight, Evening and Fabric inspection lighting. Record browser checks separately from physical devices.

For the Bay Window link, open the Shopify page with `?room=bay&fabric=pt-1204-212`. Confirm that its embedded app-proxy URL and direct-open link both retain `room=bay`, and that the room is selected on first render and after retry. The wrapper must continue to ignore unknown room IDs and preserve duplicate fabric parameters for runtime validation.

Bay Window Room view includes the reading chair, side table, round rug, footstool, lamp, planting and bookcase. Its camera shows the full furniture composition; Curtain and Full curtain views retain their fabric framing. Check that the Armchair colour control and existing wall, ceiling, floor and window-seat controls persist when leaving and returning to Bay. The four curtain panels still use one fabric width each and the existing verified 120 cm (or fabric-specific 100 cm) drop. Evening dims the garden and Lamps uses the room's existing lighting control.

For a deliberately new renderer release, retain older immutable packs and extend `lib/room-visualiser/released-assets.json` with the new pack's original file hashes alongside its build manifest. Do not weaken the guard to make an incomplete deployment pass. For an unrelated deployment, no manifest or asset change is needed.

Rollback must restore the immediately preceding live deployment, preserving newer services. A historical Room Visualiser deployment from before the specialist release is not a suitable whole-service rollback target.
