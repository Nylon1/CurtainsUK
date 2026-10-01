"""Fetch only the accepted design-source artifact named by a reuse batch."""

import argparse
import json
import subprocess
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--selection", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    selection = json.loads(args.selection.read_text(encoding="utf-8"))
    if selection.get("selection_subtype") != "design-reuse":
        print("NO_DESIGN_SOURCE_NEEDED")
        return
    source = selection["design_reuse_source"]
    run_id, artifact_id, name = source["run_id"], source["artifact_id"], source["artifact_name"]
    if not isinstance(run_id, int) or not isinstance(artifact_id, int) or name != "partial-hybrid-scale-batch":
        raise ValueError("DESIGN_SOURCE_ID_INVALID")
    info = json.loads(subprocess.run(["gh", "api", f"repos/Nylon1/CurtainsUK/actions/artifacts/{artifact_id}"], check=True, capture_output=True, text=True).stdout)
    if info["id"] != artifact_id or info["name"] != name or info["workflow_run"]["id"] != run_id or info["expired"]:
        raise ValueError("DESIGN_SOURCE_ARTIFACT_MISMATCH")
    args.out.mkdir(parents=True, exist_ok=True)
    subprocess.run(["gh", "run", "download", str(run_id), "-R", "Nylon1/CurtainsUK", "-n", name, "-D", str(args.out)], check=True)
    verification = json.loads((args.out / "verification.json").read_text(encoding="utf-8"))
    if verification.get("verdict") != "CLEAN" or verification.get("production_database_writes") != 0 or verification.get("known_fields_changed_outside_requested_delta") != 0:
        raise ValueError("DESIGN_SOURCE_VERIFICATION_FAILED")
    for group in selection["pilot_b"]:
        source_id = group["design_reuse_source_fabric_id"]
        if group["design_reuse_source_run_id"] != run_id or group["design_reuse_source_artifact_id"] != artifact_id or not (args.out / "fabrics" / f"{source_id}.json").is_file():
            raise ValueError(f"DESIGN_SOURCE_FABRIC_MISSING_{source_id}")
    print(json.dumps({"source_run_id": run_id, "source_artifact_id": artifact_id, "designs": len({g["design_id"] for g in selection["pilot_b"]})}))


if __name__ == "__main__":
    main()
