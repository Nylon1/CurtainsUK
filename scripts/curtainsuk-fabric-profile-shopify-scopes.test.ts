import test from "node:test";
import assert from "node:assert/strict";
import { assertFabricProfileShopifyScopes } from "../lib/fabric-master/fabric-profile-shopify-scopes";

test("dry run accepts write scopes as their corresponding read grants", () => {
  const scopes = new Set(["write_metaobjects", "write_metaobject_definitions"]);
  assert.doesNotThrow(() => assertFabricProfileShopifyScopes(scopes, false));
});

test("dry run rejects a missing metaobject read grant", () => {
  const scopes = new Set(["write_metaobject_definitions"]);
  assert.throws(
    () => assertFabricProfileShopifyScopes(scopes, false),
    /FABRIC_PROFILE_SCOPE_MISSING:read_metaobjects/,
  );
});

test("dry run rejects a missing definition read grant", () => {
  const scopes = new Set(["write_metaobjects"]);
  assert.throws(
    () => assertFabricProfileShopifyScopes(scopes, false),
    /FABRIC_PROFILE_SCOPE_MISSING:read_metaobject_definitions/,
  );
});

test("apply still requires explicit write_metaobjects", () => {
  const scopes = new Set(["read_metaobjects", "read_metaobject_definitions"]);
  assert.throws(
    () => assertFabricProfileShopifyScopes(scopes, true),
    /FABRIC_PROFILE_SCOPE_MISSING:write_metaobjects/,
  );
});

test("explicit read scopes still satisfy dry-run requirements", () => {
  const scopes = new Set(["read_metaobjects", "read_metaobject_definitions"]);
  assert.doesNotThrow(() => assertFabricProfileShopifyScopes(scopes, false));
});
