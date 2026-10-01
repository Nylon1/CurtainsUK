"""Consolidate accepted offline patch artifacts without changing production."""

import argparse
from collections import Counter
from datetime import datetime, timezone
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audit", type=Path, required=True)
    parser.add_argument("--source", action="append", required=True,
                        help="run_id:artifact_id:downloaded_artifact_directory")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    audit = json.loads(args.audit.read_text(encoding="utf-8"))
    if audit["audit_version"] != "partial-hybrid-completion-audit-v1":
        raise ValueError("AUDIT_VERSION_INVALID")
    records = audit["records"]
    if len(records) != 9214:
        raise ValueError("AUDIT_COHORT_INVALID")
    manifest = {}
    for record in records:
        fabric_id = record["fabric_id"]
        if fabric_id in manifest:
            raise ValueError(f"AUDIT_DUPLICATE_{fabric_id}")
        requested = sorted(set(record["requested_missing_colourway_fields"] + record["requested_missing_design_fields"]))
        manifest[fabric_id] = {
            "fabric_id": fabric_id,
            "original_operational_class": record["operational_class"],
            "design_id": record["design_id"],
            "supplier": record["supplier_id"],
            "audited_missing_fields": requested,
            "requested_fields_covered_offline": [],
            "accepted_patch": {},
            "confidence": {},
            "provenance": {},
            "manufacturer_authority_override": False,
            "source_run_artifacts": [],
            "remaining_legitimate_gaps": [],
            "genuinely_unresolved_fields": [],
            "practical_completion_status": "ALREADY_PRACTICALLY_COMPLETE" if record["operational_class"] == "A" else "PENDING_OFFLINE_COMPLETION",
        }

    source_keys = set()
    ai_requests_actual = 0
    accepted_patch_fragments = 0
    for source in args.source:
        run_id, artifact_id, directory = source.split(":", 2)
        if not run_id.isdigit() or not artifact_id.isdigit() or (run_id, artifact_id) in source_keys:
            raise ValueError("SOURCE_ID_INVALID_OR_DUPLICATE")
        source_keys.add((run_id, artifact_id))
        files = sorted((Path(directory) / "fabrics").glob("*.json"))
        if not files:
            raise ValueError(f"SOURCE_HAS_NO_ACCEPTED_PATCHES_{run_id}")
        source_summary = json.loads((Path(directory) / "summary.json").read_text(encoding="utf-8"))
        if source_summary["production_database_writes"] != 0:
            raise ValueError(f"SOURCE_IS_NOT_ARTIFACT_ONLY_{run_id}")
        ai_requests_actual += source_summary["total_openai_requests"]
        for file in files:
            result = json.loads(file.read_text(encoding="utf-8"))
            fabric_id = result["fabric_id"]
            if fabric_id != file.stem or fabric_id not in manifest:
                raise ValueError(f"FABRIC_ID_OR_AUDIT_MISMATCH_{fabric_id}")
            if result["known_fields_changed_outside_requested_delta"] != 0:
                raise ValueError(f"KNOWN_FIELD_MUTATION_{fabric_id}")
            record = manifest[fabric_id]
            if record["original_operational_class"] == "A":
                raise ValueError(f"CLASS_A_WAS_REPROCESSED_{fabric_id}")
            patch = result["patch"]
            requested = patch["requested_missing_fields"]
            if len(requested) != len(set(requested)) or set(requested) - set(record["audited_missing_fields"]):
                raise ValueError(f"UNAUDITED_REQUESTED_FIELD_{fabric_id}")
            if set(requested) & set(record["requested_fields_covered_offline"]):
                raise ValueError(f"ACCEPTED_FIELD_RERUN_{fabric_id}")
            new_values = patch["new_values_only"]
            if set(new_values) - set(requested):
                raise ValueError(f"NEW_VALUE_OUTSIDE_DELTA_{fabric_id}")
            for field, value in new_values.items():
                record["accepted_patch"][field] = value
                record["confidence"][field] = patch["confidence_per_new_field"][field]
                record["provenance"][field] = patch["provenance_per_new_field"][field]
            record["requested_fields_covered_offline"].extend(requested)
            record["manufacturer_authority_override"] |= bool(patch["manufacturer_authority_applied"])
            record["source_run_artifacts"].append({"run_id": run_id, "artifact_id": artifact_id})
            accepted_patch_fragments += 1
            record["remaining_legitimate_gaps"].extend(patch["legitimate_remaining_gaps"])
            record["genuinely_unresolved_fields"].extend(result["genuinely_unresolved_fields"])
            if patch["practical_completion_status"] == "NEEDS_MATERIAL_REVIEW":
                record["practical_completion_status"] = "NEEDS_MATERIAL_REVIEW"

    for record in manifest.values():
        if record["original_operational_class"] == "A" or record["practical_completion_status"] == "NEEDS_MATERIAL_REVIEW":
            continue
        outstanding = set(record["audited_missing_fields"]) - set(record["requested_fields_covered_offline"])
        record["outstanding_audited_fields"] = sorted(outstanding)
        if outstanding:
            record["practical_completion_status"] = "PENDING_OFFLINE_COMPLETION"
        elif record["genuinely_unresolved_fields"]:
            record["practical_completion_status"] = "PRACTICALLY_ENRICHED_WITH_MINOR_GAPS"
        else:
            record["practical_completion_status"] = "MAXIMALLY_PRACTICALLY_ENRICHED"
        record["requested_fields_covered_offline"].sort()

    statuses = Counter(record["practical_completion_status"] for record in manifest.values())
    patched = sum(bool(record["source_run_artifacts"]) for record in manifest.values())
    output = {
        "manifest_version": "partial-hybrid-offline-master-v1",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "audit_version": audit["audit_version"],
        "production_published": False,
        "source_run_artifacts": sorted([{"run_id": run, "artifact_id": artifact} for run, artifact in source_keys], key=lambda x: int(x["run_id"])),
        "summary": {
            "original_partial": len(manifest),
            "already_practically_complete": statuses["ALREADY_PRACTICALLY_COMPLETE"],
            "accepted_offline_patched_fabrics": patched,
            "accepted_patch_fragments": accepted_patch_fragments,
            "ai_requests_actual": ai_requests_actual,
            "fields_filled_offline": sum(len(record["accepted_patch"]) for record in manifest.values()),
            "manufacturer_authority_overrides": sum(bool(record["manufacturer_authority_override"]) for record in manifest.values()),
            "newly_maximally_enriched": statuses["MAXIMALLY_PRACTICALLY_ENRICHED"],
            "minor_gaps": statuses["PRACTICALLY_ENRICHED_WITH_MINOR_GAPS"],
            "material_review": statuses["NEEDS_MATERIAL_REVIEW"],
            "pending_offline_completion": statuses["PENDING_OFFLINE_COMPLETION"],
            "total_practically_complete": statuses["ALREADY_PRACTICALLY_COMPLETE"] + statuses["MAXIMALLY_PRACTICALLY_ENRICHED"] + statuses["PRACTICALLY_ENRICHED_WITH_MINOR_GAPS"],
        },
        "fabrics": [manifest[fabric_id] for fabric_id in sorted(manifest)],
    }
    if sum(statuses.values()) != 9214:
        raise ValueError("MANIFEST_TOTAL_MISMATCH")
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps(output["summary"]))


if __name__ == "__main__":
    main()
