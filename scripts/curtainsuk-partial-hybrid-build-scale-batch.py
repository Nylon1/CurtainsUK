"""Build a read-only patch batch from the saved partial audit and accepted artifacts."""

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
    parser.add_argument("--batch-size", type=int, required=True)
    parser.add_argument("--kind", choices=["colourway-simple", "colourway", "design-seed", "design-reuse", "design"], required=True)
    parser.add_argument("--design-source-dir", type=Path)
    parser.add_argument("--design-source-run-id", type=int)
    parser.add_argument("--design-source-artifact-id", type=int)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    audit_bytes = args.audit.read_bytes()
    audit = json.loads(audit_bytes)
    if audit["audit_version"] != "partial-hybrid-completion-audit-v1" or audit["summary"]["total_partial_fabrics"] != 9214:
        raise ValueError("AUDIT_SOURCE_INVALID")
    records = audit["records"]
    if len(records) != 9214 or len({r["fabric_id"] for r in records}) != 9214:
        raise ValueError("AUDIT_COHORT_INVALID")

    if args.batch_number < 1 or not 1 <= args.batch_size <= 500:
        raise ValueError("BATCH_LIMIT_INVALID")
    accepted = defaultdict(set)
    for directory in args.accepted_dir:
        files = sorted((directory / "fabrics").glob("*.json"))
        if not files:
            raise ValueError(f"ACCEPTED_ARTIFACT_EMPTY_{directory}")
        for file in files:
            result = json.loads(file.read_text(encoding="utf-8"))
            fabric_id = result["fabric_id"]
            if fabric_id != file.stem:
                raise ValueError(f"ACCEPTED_FABRIC_MISMATCH_{fabric_id}")
            if result["known_fields_changed_outside_requested_delta"] != 0:
                raise ValueError(f"ACCEPTED_KNOWN_FIELD_MUTATION_{fabric_id}")
            fields = set(result["patch"]["requested_missing_fields"])
            if fields & accepted[fabric_id]:
                raise ValueError(f"ACCEPTED_FIELD_RERUN_{fabric_id}")
            accepted[fabric_id].update(fields)
    audit_ids = {r["fabric_id"] for r in records}
    if set(accepted) - audit_ids:
        raise ValueError("ACCEPTED_OUTSIDE_AUDIT")

    design_sources = {}
    if args.kind == "design-reuse":
        if not args.design_source_dir or not args.design_source_run_id or not args.design_source_artifact_id:
            raise ValueError("DESIGN_REUSE_SOURCE_REQUIRED")
        verification = json.loads((args.design_source_dir / "verification.json").read_text(encoding="utf-8"))
        if verification.get("verdict") != "CLEAN" or verification.get("production_database_writes") != 0 or verification.get("known_fields_changed_outside_requested_delta") != 0:
            raise ValueError("DESIGN_REUSE_SOURCE_NOT_CLEAN")
        seed = json.loads((args.design_source_dir / "selection.json").read_text(encoding="utf-8"))
        if seed["selection_subtype"] != "design-seed":
            raise ValueError("DESIGN_REUSE_SOURCE_NOT_SEED")
        for group in seed["pilot_b"]:
            key = (group["supplier_id"], group["design_id"])
            source_id = group["design_seed_source_fabric_id"]
            source = json.loads((args.design_source_dir / "fabrics" / f"{source_id}.json").read_text(encoding="utf-8"))
            if source["fabric_id"] != source_id or source["manufacturer_context_used"]["design_id"] != key[1] or source["manufacturer_context_used"]["supplier_id"] != key[0] or source["known_fields_changed_outside_requested_delta"] != 0 or source["model"] != "gpt-5.6-terra" or source["reasoning"] != "medium":
                raise ValueError(f"DESIGN_REUSE_SOURCE_IDENTITY_INVALID_{key}")
            design_sources[key] = (source_id, source)

    by_design = defaultdict(list)
    design_only_targets = defaultdict(list)
    if args.kind == "design-seed":
        for record in records:
            if record["operational_class"] != "C":
                continue
            fields = [field for field in record["requested_missing_design_fields"] if field not in accepted.get(record["fabric_id"], set())]
            if fields:
                design_only_targets[(record["supplier_id"], record["design_id"])].append((record, fields))
    for record in records:
        if record["operational_class"] not in ("C", "D"):
            continue
        if args.kind == "colourway-simple" and record["requested_missing_design_fields"]:
            continue
        if args.kind == "design-seed":
            if record["operational_class"] != "D":
                continue
            design_fields = [field for field in record["requested_missing_design_fields"] if field not in accepted.get(record["fabric_id"], set())]
            if design_fields:
                colour_fields = [field for field in record["requested_missing_colourway_fields"] if field not in accepted.get(record["fabric_id"], set())]
                if not colour_fields:
                    raise ValueError("DESIGN_SEED_REQUIRES_UNPATCHED_COLOURWAY")
                by_design[(record["supplier_id"], record["design_id"])].append((record, colour_fields, design_fields))
            continue
        if args.kind == "design-reuse":
            if record["operational_class"] != "D":
                continue
            design_fields = [field for field in record["requested_missing_design_fields"] if field not in accepted.get(record["fabric_id"], set())]
            if design_fields:
                colour_fields = [field for field in record["requested_missing_colourway_fields"] if field not in accepted.get(record["fabric_id"], set())]
                if not colour_fields:
                    raise ValueError("DESIGN_REUSE_REQUIRES_UNPATCHED_COLOURWAY")
                key = (record["supplier_id"], record["design_id"])
                if key not in design_sources:
                    raise ValueError(f"DESIGN_REUSE_SOURCE_MISSING_{key}")
                source_patch = design_sources[key][1]["patch"]
                covered = set(source_patch["new_values_only"]) | {g["field"] for g in source_patch["legitimate_remaining_gaps"]}
                if set(design_fields) - covered:
                    raise ValueError(f"DESIGN_REUSE_FIELD_NOT_COVERED_{key}")
                by_design[key].append((record, colour_fields, design_fields))
            continue
        dimension = "requested_missing_colourway_fields" if args.kind.startswith("colourway") else "requested_missing_design_fields"
        fields = [field for field in record[dimension] if field not in accepted.get(record["fabric_id"], set())]
        if not fields:
            continue
        if args.kind.startswith("colourway") and record["operational_class"] != "D":
            raise ValueError("COLOURWAY_GAP_OUTSIDE_CLASS_D")
        by_design[(record["supplier_id"], record["design_id"])].append((record, fields))

    groups = []
    for (supplier_id, design_id), members in sorted(by_design.items()):
        if args.kind == "design-reuse":
            members.sort(key=lambda item: item[0]["fabric_id"])
            source_id = design_sources[(supplier_id, design_id)][0]
            for start in range(0, len(members), 4):
                subset = members[start : start + 4]
                ids = [r["fabric_id"] for r, _, _ in subset]
                groups.append({
                    "supplier_id": supplier_id,
                    "design_id": design_id,
                    "affected_fabric_ids": ids,
                    "design_reuse_source_fabric_id": source_id,
                    "design_reuse_source_run_id": args.design_source_run_id,
                    "design_reuse_source_artifact_id": args.design_source_artifact_id,
                    "requested_missing_fields_by_fabric": {r["fabric_id"]: colour + design for r, colour, design in subset},
                    "ai_requested_missing_fields_by_fabric": {r["fabric_id"]: colour for r, colour, _ in subset},
                    "reused_design_fields_by_fabric": {r["fabric_id"]: design for r, _, design in subset},
                    "colourway_missing_fields_by_fabric": {r["fabric_id"]: colour for r, colour, _ in subset},
                    "shared_design_missing_fields_by_fabric": {r["fabric_id"]: design for r, _, design in subset},
                })
            continue
        if args.kind == "design-seed":
            union = set().union(*(set(design_fields) for _, _, design_fields in members))
            covering = sorted((r for r, _, design_fields in members if set(design_fields) == union), key=lambda r: r["fabric_id"])
            if not covering:
                raise ValueError(f"DESIGN_SEED_UNION_NOT_COVERED_{design_id}")
            source_id = covering[0]["fabric_id"]
            members.sort(key=lambda item: (item[0]["fabric_id"] != source_id, item[0]["fabric_id"]))
            subset = members[:4]
            ids = [r["fabric_id"] for r, _, _ in subset]
            c_targets = {r["fabric_id"]: fields for r, fields in design_only_targets[(supplier_id, design_id)] if set(fields) <= union}
            groups.append({
                "supplier_id": supplier_id,
                "design_id": design_id,
                "affected_fabric_ids": ids,
                "design_seed_source_fabric_id": source_id,
                "requested_missing_fields_by_fabric": {r["fabric_id"]: colour + design for r, colour, design in subset},
                "colourway_missing_fields_by_fabric": {r["fabric_id"]: colour for r, colour, _ in subset},
                "shared_design_missing_fields_by_fabric": {r["fabric_id"]: design for r, _, design in subset},
                "design_only_reuse_targets_by_fabric": c_targets,
            })
            continue
        members.sort(key=lambda pair: pair[0]["fabric_id"])
        step = 4 if args.kind.startswith("colourway") else len(members)
        for start in range(0, len(members), step):
            subset = members[start : start + step]
            ids = [r["fabric_id"] for r, _ in subset]
            fields = {r["fabric_id"]: missing for r, missing in subset}
            groups.append({
                "supplier_id": supplier_id,
                "design_id": design_id,
                "affected_fabric_ids": ids,
                "requested_missing_fields_by_fabric": fields,
                "representative_fabric_id": ids[0] if args.kind == "design" else None,
                "colourway_missing_fields_by_fabric": fields if args.kind.startswith("colourway") else {},
                "shared_design_missing_fields_by_fabric": fields if args.kind == "design" else {},
            })

    # Accepted artifacts are the cursor. Recalculate the first unprocessed
    # groups each time; an index offset would skip work after subtraction.
    selected = groups[: args.batch_size]
    if not selected:
        raise ValueError("NO_REMAINING_GROUPS")
    ids = [fabric_id for group in selected for fabric_id in group["affected_fabric_ids"] + list(group.get("design_only_reuse_targets_by_fabric", {}))]
    if len(ids) != len(set(ids)):
        raise ValueError("SELECTED_DUPLICATE_FABRIC")
    for group in selected:
        all_fields = {**group["requested_missing_fields_by_fabric"], **group.get("design_only_reuse_targets_by_fabric", {})}
        for fabric_id, fields in all_fields.items():
            if set(fields) & accepted.get(fabric_id, set()):
                raise ValueError(f"SELECTED_ACCEPTED_FIELD_OVERLAP_{fabric_id}")
    output = {
        "selection_version": "partial-hybrid-scale-batch-v1",
        "recorded_before_inference": True,
        "selection_rule": "Audit missing fields minus every accepted field per fabric; sorted by supplier/design/fabric ID. Grouped requests have at most four images. Shared design values are inferred once and reused only for eligible siblings.",
        "selection_subtype": args.kind,
        "selection_kind": "colourway" if args.kind.startswith("colourway") or args.kind in ("design-seed", "design-reuse") else "design",
        "design_reuse_source": {"run_id": args.design_source_run_id, "artifact_id": args.design_source_artifact_id, "artifact_name": "partial-hybrid-scale-batch"} if args.kind == "design-reuse" else None,
        "source_audit_sha256": hashlib.sha256(audit_bytes).hexdigest(),
        "accepted_fabric_ids_sha256": digest(accepted),
        "accepted_fields_sha256": digest(f"{fabric_id}:{field}" for fabric_id, fields in accepted.items() for field in fields),
        "accepted_fields_by_fabric": {fabric_id: sorted(fields) for fabric_id, fields in sorted(accepted.items())},
        "accepted_fabrics_seen": len(accepted),
        "accepted_artifact_sources": [p.name for p in args.accepted_dir],
        "batch_number": args.batch_number,
        "batch_size": args.batch_size,
        "model": "gpt-5.6-terra",
        "reasoning": "medium",
        "max_inference_concurrency": 3,
        "expected_openai_requests": len(selected),
        "expected_fabric_count": len(ids),
        "pilot_a": selected if args.kind == "design" else [],
        "pilot_b": selected if args.kind.startswith("colourway") or args.kind in ("design-seed", "design-reuse") else [],
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"kind": args.kind, "groups": len(selected), "fabrics": len(ids), "accepted_fabrics_seen": len(accepted), "remaining_candidate_groups": len(groups)}))


if __name__ == "__main__":
    main()
