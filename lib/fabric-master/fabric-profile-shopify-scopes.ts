const READ_REQUIREMENTS = [
  { read: "read_metaobjects", write: "write_metaobjects" },
  { read: "read_metaobject_definitions", write: "write_metaobject_definitions" },
] as const;

export function assertFabricProfileShopifyScopes(scopes: ReadonlySet<string>, apply: boolean): void {
  for (const { read, write } of READ_REQUIREMENTS) {
    if (!scopes.has(read) && !scopes.has(write)) {
      throw new Error(`FABRIC_PROFILE_SCOPE_MISSING:${read}`);
    }
  }

  if (apply && !scopes.has("write_metaobjects")) {
    throw new Error("FABRIC_PROFILE_SCOPE_MISSING:write_metaobjects");
  }
}
