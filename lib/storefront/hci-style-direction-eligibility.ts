import { fabricReadiness } from '../fabric-master/readiness';
import type { FabricMasterRecord } from '../fabric-master/types';

/**
 * The retail direction gate deliberately needs only the facts used by the
 * existing readiness rule. Keeping this small lets a selected price cohort be
 * checked without hydrating unrelated Fabric Master fields.
 */
export type RetailDirectionCandidate = Pick<
  FabricMasterRecord,
  | 'fabric_id'
  | 'supplier_id'
  | 'supplier_sku'
  | 'brand_name'
  | 'design_name'
  | 'colour_name'
  | 'lifecycle_state'
  | 'staging_catalog_visible'
  | 'imagery'
  | 'usable_width_mm'
  | 'full_width_mm'
  | 'pattern_match_type'
>;

export type ApprovedImageRow = {
  fabric_id: string;
  supplier_id: string;
  supplier_sku: string;
  fabric_media_assets: { shopify_cdn_url: string; width: number; height: number } | null;
};

/**
 * Style cards use the existing retail projection. Select only identities that
 * already have its approved, exact-identity customer image requirement, so a
 * valid HCI result cannot later degrade into an unavailable visual card.
 */
export function retailStyleDirectionEligibility(
  records: readonly RetailDirectionCandidate[],
  mappings: readonly ApprovedImageRow[],
) {
  const approved = new Set(
    mappings
      .filter((row) => {
        const asset = row.fabric_media_assets;
        return Boolean(
          asset &&
            asset.width > 0 &&
            asset.height > 0 &&
            /^https:\/\/cdn\.shopify\.com\/[^?#]+$/.test(asset.shopify_cdn_url),
        );
      })
      .map((row) => JSON.stringify([row.fabric_id, row.supplier_id, row.supplier_sku])),
  );
  return [...new Set(
    records
      .filter((record) =>
        fabricReadiness(record).recommendationEligible &&
        approved.has(JSON.stringify([record.fabric_id, record.supplier_id, record.supplier_sku])),
      )
      .map((record) => record.fabric_id),
  )].sort();
}

