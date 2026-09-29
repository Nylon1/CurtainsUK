# Fabric Intelligence and Naila release-hardening matrix

These files are **test-only**. They do not participate in the storefront or gateway build. The [scenario definitions](scenarios.json) contain the coverage and expected invariants; the runners make synthetic customer requests through the existing Shopify-facing app proxy. No cart, order, product, supplier, pricing, stock or database-schema write is made. The private saved-version audit is read-only.

## Run before a FI/Naila release

First run the offline checks, which need no credentials or network access:

```sh
node --test tests/fi-naila-release-hardening/matrix.test.mjs
```

For the complete controlled gateway matrix, supply the exact Shopify-facing origin and explicit opt-ins, then run:

```sh
CUK_RELEASE_MATRIX_TARGET=https://www.curtainsuk.com \
CUK_RELEASE_MATRIX_ALLOW_WRITES=1 \
CUK_RELEASE_MATRIX_AUDIT_DB=1 \
CUK_RELEASE_MATRIX_OWNER_SESSION=/private/path/to/authorised-owner-session.json \
CUK_RELEASE_MATRIX_DIRECT_GATEWAY=https://existing-gateway.example \
CUK_RELEASE_MATRIX_HCI_REPO=/path/to/Hybrid-Curtain-Intelligence-candidate \
SUPABASE_URL=https://authorised-project.supabase.co \
SUPABASE_SECRET_KEY=... \
node tests/fi-naila-release-hardening/run-all.mjs
```

On PowerShell, set the same environment variables with `$env:NAME = 'value'` before running the final `node` command. Use credentials and an owner-session fixture held outside Git. The owner fixture has the shape `{ "capability": "...", "view": { "sessionId": "...", "revision": 0 } }`; it must refer to an authorised synthetic or owner preview session on the selected target. Never commit the fixture or a service key. The direct gateway target is used only for the unsigned-request rejection test.

The suite first replays all **4,096** ordered histories through the provided HCI candidate checkout, using a temporary test file that is removed immediately after the run. It then creates 28 sequential FI cases across all four price bands. Their six-event histories cover every position/reaction pair. It checks image/Room Palette and no-image routes, FI/Naila question order, directions, feedback on both directions, refinement, handoffs, retries, stale revisions, resume and ordinary Browse/Samples. A separate fresh Naila journey and palette-influence journey are included. The read-only audit loads the **six saved private versions of each synthetic FI session** and verifies exact revision, reaction and Fabric Master ID prefixes. It never deduplicates histories by final profile. Outputs go to ignored `_results/`; they contain only test session IDs, redacted summaries and timing rows, not capabilities, full views or private state.

The full result validator fails on unexpected HTTP status, a request above 20 seconds, a skipped required case, incomplete six-version history, changed question order, or missing pairwise coverage. `gatewayDurationMs` and the HCI result should be populated only from separately matched gateway logs; customer round-trip time is never labelled gateway time. Preserve the raw result files for a specific release outside Git if needed, with normal access controls.

This repository also has focused gateway contract tests under `lib/storefront/__tests__`. Run those against the candidate gateway, including the feedback-menu boundary (13+ valid upstream options projected to the first 12 while malformed options fail closed). The HCI exhaustive replay uses the HCI candidate's actual engine modules; the CurtainsUK offline matrix test separately proves enumeration and pairwise coverage, while the private saved-version audit proves actual gateway persistence.

Prepared Browse dirty/fallback, natural supplier-stock refresh during a consultation, active-batch deferral and historical stock-expiry crossings are observation-only scenarios. Do not force the live supplier or projection state to manufacture them. Mark them **OPEN** until a natural event or an isolated local fixture proves the relevant behaviour; never report the gateway matrix alone as live proof of those lifecycle events.
