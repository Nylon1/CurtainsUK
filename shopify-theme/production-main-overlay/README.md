# Production MAIN theme overlay

The files under this directory are a scoped readback of Shopify MAIN theme `182339731835` on 17 October 2026. They are the five substantive replacements and 22 MAIN-only files needed to reproduce the complete 537-file live theme from `shopify-theme/curtainsuk-dawn-16`. No live file was changed while creating this record.

The MAIN-only files include retained historical storefront versions, studio images and app-owned metaobject templates. Their presence in the readback does not mean they should be linked to a new customer journey. The live cart templates also contain existing app modifications; preserve them when preparing a full-theme release.

Run `node scripts/verify-production-theme-sync.mjs` at the repository root to check the source against `manifest.json`. Add `--live <directory>` after a fresh pull of MAIN to detect drift. Add `--output <empty directory outside the repository>` to assemble the source and overlay into a deployable theme directory. Review and push only the intended changed files through the protected release workflow. Never push this overlay directory alone.

The manifest compares JSON values after stripping Shopify's generated header comment and normalizes text line endings and trailing whitespace. Binary assets are hashed exactly. See `docs/CUSHION_MY_HOME_PRODUCTION_SYNC_20261017.md` for serving API identity, configuration and evidence limits.
