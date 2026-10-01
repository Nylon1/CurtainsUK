"""Build a read-only colourway-delta batch from the saved partial audit and accepted artifacts."""

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path


def digest(items):
    return hashlib.sha256("\n".join(sorted(items)).encode()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audit", type=Path, required=True)
    parser.add_argument("--accepted-dir", type=Path, action="append", required=True)
    parser.add_argument("--batch-number", type=int, required=True)
    parser.add_argument("--batch-size", type=int, choices=[250, 500], required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    audit_bytes = args.audit.read_bytes()
    audit = json.loads(audit_bytes)
    if audit["audit_version"] != "partial-hybrid-completion-audit-v1" or audit["summary"]["total_partial_fabrics"] != 9214:
        raise ValueError("AUDIT_SOURCE_INVALID")
    records = audit["records"]
    if len(records) != 9214 or len({r["fabric_id"] for r in records}) != 9214:
        raise ValueError("AUDIT_COHORT_INVALID")

    accepted = {}
    for directory in args.accepted_dir:
        files = sorted((directory / "fabrics").glob("*.json"))
        if not files:
            raise ValueError(f"ACCEPTED_ARTIFACT_EMPTY_{directory}")
        for file in files:
            result = json.loads(file.read_text(encoding="utf-8"))
            fabric_id = result["fabric_id"]
            if fabric_id != file.stem or fabric_id in accepted:
                raise ValueError(f"ACCEPTED_FABRIC_DUPLICATE_OR_MISMATCH_{fabric_id}")
            if result["known_fields_changed_outside_requested_delta"] != 0:
                raise ValueError(f"ACCEPTED_KNOWN_FIELD_MUTATION_{fabric_id}")
            accepted[fabric_id] = result
    audit_ids = {r["fabric_id"] for r in records}
    if set(accepted) - audit_ids:
        raise ValueError("ACCEPTED_OUTSIDE_AUDIT")

    by_design = defaultdict(list)
    for record in records:
        if record["operational_class"] != "D" or record["fabric_id"] in accepted:
            continue
        # The first scale tranche uses exact colourway-only gaps. Shared design
        # gaps are handled later with one design delta and sibling reuse.
        if record["requested_missing_design_fields"]:
            continue
        fields = record["requested_missing_colourway_fields"]
        if not fields:
            raise ValueError("D_WITHOUT_COLOURWAY_GAP")
        by_design[(record["supplier_id"], record["design_id"])].append(record)

    groups = []
    for (supplier_id, design_id), members in sorted(by_design.items()):
        members.sort(key=lambda r: r["fabric_id"])
        for start in range(0, len(members), 4):
            subset = members[start : start + 4]
            ids = [r["fabric_id"] for r in subset]
            fields = {r["fabric_id"]: r["requested_missing_colourway_fields"] for r in subset}
            groups.append({
                "supplier_id": supplier_id,
                "design_id": design_id,
                "affected_fabric_ids": ids,
                "requested_missing_fields_by_fabric": fields,
                "colourway_missing_fields_by_fabric": fields,
                "shared_design_missing_fields_by_fabric": {},
            })

    # Accepted artifacts are the cursor. Recalculate the first unprocessed
    # groups each time; an index offset would skip work after subtraction.
    selected = groups[: args.batch_size]
    if len(selected) != args.batch_size:
        raise ValueError(f"INSUFFICIENT_GROUPS_{len(selected)}")
    ids = [fabric_id for group in selected for fabric_id in group["affected_fabric_ids"]]
    if len(ids) != len(set(ids)) or set(ids) & set(accepted):
        raise ValueError("SELECTED_ACCEPTED_OVERLAP_OR_DUPLICATE")
    output = {
        "selection_version": "partial-hybrid-scale-batch-v1",
        "recorded_before_inference": True,
        "selection_rule": "Audit class D, colourway-only missing fields, sorted by supplier/design/fabric ID; accepted artifact fabric IDs excluded before grouping; at most four siblings per group.",
        "source_audit_sha256": hashlib.sha256(audit_bytes).hexdigest(),
        "accepted_fabric_ids_sha256": digest(accepted),
        "accepted_fabrics_excluded": len(accepted),
        "accepted_artifact_sources": [p.name for p in args.accepted_dir],
        "batch_number": args.batch_number,
        "batch_size": args.batch_size,
        "model": "gpt-5.6-terra",
        "reasoning": "medium",
        "max_inference_concurrency": 3,
        "expected_openai_requests": len(selected),
        "expected_fabric_count": len(ids),
        "pilot_a": [],
        "pilot_b": selected,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"groups": len(selected), "fabrics": len(ids), "accepted_excluded": len(accepted), "remaining_candidate_groups": len(groups)}))


if __name__ == "__main__":
    main()
