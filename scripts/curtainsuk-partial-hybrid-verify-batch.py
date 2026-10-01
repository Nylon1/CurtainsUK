"""Verify one completed offline patch artifact before any later batch is selected."""

import argparse
import json
from pathlib import Path


SET_FIELDS = {"secondaryColours", "motif", "visualSurface", "character"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact", type=Path, required=True)
    args = parser.parse_args()
    artifact = args.artifact
    selection = json.loads((artifact / "selection.json").read_text(encoding="utf-8"))
    summary = json.loads((artifact / "summary.json").read_text(encoding="utf-8"))
    groups = selection["pilot_a"] + selection["pilot_b"]
    requested = {}
    for group in groups:
        for fabric_id in group["affected_fabric_ids"]:
            if fabric_id in requested:
                raise ValueError(f"DUPLICATE_SELECTED_FABRIC_{fabric_id}")
            requested[fabric_id] = group["requested_missing_fields_by_fabric"][fabric_id]
        for fabric_id, fields in group.get("design_only_reuse_targets_by_fabric", {}).items():
            if fabric_id in requested:
                raise ValueError(f"DUPLICATE_SELECTED_FABRIC_{fabric_id}")
            requested[fabric_id] = fields
    files = sorted((artifact / "fabrics").glob("*.json"))
    raw_files = list((artifact / "raw").glob("*.json"))
    if len(files) != len(requested) or len(raw_files) != len(groups):
        raise ValueError("ARTIFACT_FILE_COUNT_MISMATCH")
    if summary["total_openai_requests"] != len(groups) or summary["failures"] or summary["total_known_fields_changed_outside_requested_delta"] != 0:
        raise ValueError("BATCH_SUMMARY_NOT_CLEAN")
    if summary["pilot_a"]["schema_failures"] or summary["pilot_b"]["schema_failures"] or summary["pilot_a"]["local_validation_failures"] or summary["pilot_b"]["local_validation_failures"] or summary["pilot_a"]["patch_new_value_invalid"] or summary["pilot_b"]["patch_new_value_invalid"]:
        raise ValueError("PATCH_CONTRACT_FAILURE")
    seen = set()
    fields_filled = 0
    authority = 0
    for file in files:
        result = json.loads(file.read_text(encoding="utf-8"))
        fabric_id = result["fabric_id"]
        if fabric_id != file.stem or fabric_id not in requested or fabric_id in seen:
            raise ValueError(f"FABRIC_RESULT_ID_INVALID_{fabric_id}")
        seen.add(fabric_id)
        patch = result["patch"]
        if patch["requested_missing_fields"] != requested[fabric_id]:
            raise ValueError(f"REQUESTED_FIELD_BOUNDARY_CHANGED_{fabric_id}")
        new = patch["new_values_only"]
        if set(new) - set(requested[fabric_id]):
            raise ValueError(f"UNREQUESTED_FIELD_RETURNED_{fabric_id}")
        if set(new) != set(patch["confidence_per_new_field"]) or set(new) != set(patch["provenance_per_new_field"]):
            raise ValueError(f"CONFIDENCE_OR_PROVENANCE_MISSING_{fabric_id}")
        for field, value in new.items():
            if field in SET_FIELDS:
                if not isinstance(value, list) or not value or len(value) != len(set(value)) or "unknown" in value:
                    raise ValueError(f"SET_VALUE_INVALID_{fabric_id}_{field}")
            elif not isinstance(value, str) or value == "unknown":
                raise ValueError(f"SCALAR_VALUE_INVALID_{fabric_id}_{field}")
        before = result["current_stored_reading"]
        after = result["reconstructed_final_reading"]
        for field in before:
            if field not in requested[fabric_id] and before[field] != after[field]:
                raise ValueError(f"KNOWN_FIELD_CHANGED_{fabric_id}_{field}")
        if result["known_fields_changed_outside_requested_delta"] != 0:
            raise ValueError(f"RUNNER_KNOWN_FIELD_CHANGE_{fabric_id}")
        fields_filled += len(new)
        authority += bool(patch["manufacturer_authority_applied"])
    if seen != set(requested) or fields_filled != summary["pilot_a"]["fields_filled"] + summary["pilot_b"]["fields_filled"]:
        raise ValueError("BATCH_RECONCILIATION_FAILED")
    report = {
        "request_groups": len(groups),
        "fabrics_covered": len(seen),
        "openai_success": len(groups),
        "openai_failed": 0,
        "patches_accepted": len(seen),
        "patches_rejected": 0,
        "fields_filled": fields_filled,
        "manufacturer_authority_overrides": authority,
        "schema_failures": 0,
        "local_validation_failures": 0,
        "patch_new_value_invalid": 0,
        "known_fields_changed_outside_requested_delta": 0,
        "raw_responses_retained": len(raw_files),
        "production_database_writes": summary["production_database_writes"],
        "verdict": "CLEAN",
    }
    if report["production_database_writes"] != 0:
        raise ValueError("PRODUCTION_DATABASE_WRITE_REPORTED")
    (artifact / "verification.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
