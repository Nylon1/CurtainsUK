import assert from "node:assert/strict";
import { test } from "node:test";
import { assertArtifactOnlyDatabaseRequest } from "../curtainsuk-visual-hybrid-artifact";

const allowed = new URL("https://hqysjumypgeapgmqkcrx.supabase.co/rest/v1/fabric_colourways?select=fabric_id");

test("artifact-only database boundary permits only allowlisted GET reads", () => {
  assert.doesNotThrow(() => assertArtifactOnlyDatabaseRequest("GET", allowed));
  for (const method of ["POST","PATCH","PUT","DELETE"]) {
    assert.throws(() => assertArtifactOnlyDatabaseRequest(method, allowed), /ARTIFACT_ONLY_DATABASE_REQUEST_DENIED/);
  }
  assert.throws(() => assertArtifactOnlyDatabaseRequest("GET", new URL("https://hqysjumypgeapgmqkcrx.supabase.co/rest/v1/rpc/browse_projection_refresh_dirty")), /ARTIFACT_ONLY_DATABASE_REQUEST_DENIED/);
  assert.throws(() => assertArtifactOnlyDatabaseRequest("GET", new URL("https://other.supabase.co/rest/v1/fabric_colourways")), /ARTIFACT_ONLY_DATABASE_REQUEST_DENIED/);
  assert.throws(() => assertArtifactOnlyDatabaseRequest("GET", new URL("https://hqysjumypgeapgmqkcrx.supabase.co/rest/v1/fabric_visual_enrichment_ledger")), /ARTIFACT_ONLY_DATABASE_REQUEST_DENIED/);
});
