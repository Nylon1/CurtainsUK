import manifest from "@/generated/fabric-profile-sitemap.json";

const profileUrlByFabricId = new Map<string, string>(
  manifest.profiles.map((entry) => [entry.fabricMasterId, entry.canonicalUrl]),
);

/** Exact published Fabric Profile URL from the deterministic 10,208-profile manifest. */
export function publishedFabricProfileUrl(fabricId: string) {
  return profileUrlByFabricId.get(fabricId) ?? null;
}
