"""Validate accepted shared-design evidence, including a partial external failure."""

import json
from pathlib import Path


def validated_seed_groups(directory: Path):
    selection = json.loads((directory / "selection.json").read_text(encoding="utf-8"))
    summary = json.loads((directory / "summary.json").read_text(encoding="utf-8"))
    groups = selection.get("pilot_b", [])
    failures = summary.get("failures", [])
    phase = summary.get("pilot_b", {})
    if (selection.get("selection_subtype") != "design-seed"
            or selection.get("expected_openai_requests") != len(groups)
            or summary.get("production_database_writes") != 0
            or summary.get("total_known_fields_changed_outside_requested_delta") != 0
            or summary.get("total_openai_requests") != len(groups)
            or phase.get("schema_failures") != 0
            or phase.get("local_validation_failures") != 0
            or phase.get("patch_new_value_invalid") != 0
            or phase.get("failed") != len(failures)
            or phase.get("success") != len(groups) - len(failures)):
        raise ValueError("DESIGN_SOURCE_SUMMARY_INVALID")
    verification = directory / "verification.json"
    if verification.is_file() and json.loads(verification.read_text(encoding="utf-8")).get("verdict") != "CLEAN":
        raise ValueError("DESIGN_SOURCE_VERIFICATION_INVALID")
    if not verification.is_file() and not failures:
        raise ValueError("DESIGN_SOURCE_CLEAN_VERIFICATION_MISSING")
    keys = {(g["supplier_id"], g["design_id"]): g for g in groups}
    if len(keys) != len(groups):
        raise ValueError("DESIGN_SOURCE_GROUP_DUPLICATE")
    failed_keys = set()
    for failure in failures:
        candidates = [key for key, group in keys.items()
                      if failure.get("design_id") == key[1]
                      and failure.get("affected_fabric_ids") == group["affected_fabric_ids"]]
        error = failure.get("error", "")
        if (len(candidates) != 1 or candidates[0] in failed_keys
                or failure.get("failure_class") != "OTHER"
                or not (error.startswith("PILOT_OPENAI_RESPONSE_520")
                        or error.startswith("PILOT_OPENAI_RESPONSE_429"))):
            raise ValueError("DESIGN_SOURCE_FAILURE_NOT_EXTERNAL")
        failed_keys.add(candidates[0])
    successful = {key: group for key, group in keys.items() if key not in failed_keys}
    expected_fabrics = {
        fabric_id
        for group in successful.values()
        for fabric_id in group["affected_fabric_ids"] + list(group.get("design_only_reuse_targets_by_fabric", {}))
    }
    files = list((directory / "fabrics").glob("*.json"))
    if (len(files) != len(expected_fabrics)
            or len(list((directory / "raw").glob("*.json"))) != len(successful)
            or phase.get("patches_accepted") != len(expected_fabrics)):
        raise ValueError("DESIGN_SOURCE_ARTIFACT_COUNT_INVALID")
    for file in files:
        result = json.loads(file.read_text(encoding="utf-8"))
        if (file.stem not in expected_fabrics or result.get("fabric_id") != file.stem
                or result.get("known_fields_changed_outside_requested_delta") != 0
                or result.get("model") != "gpt-5.6-terra"
                or result.get("reasoning") != "medium"):
            raise ValueError("DESIGN_SOURCE_FABRIC_INVALID")
    return selection, successful
