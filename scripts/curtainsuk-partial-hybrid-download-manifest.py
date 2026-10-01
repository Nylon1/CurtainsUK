"""Download named accepted Actions artifacts and build one offline manifest."""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path


def run(*args):
    result = subprocess.run(args, check=True, capture_output=True, text=True)
    return result.stdout


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sources-json", type=Path, required=True)
    parser.add_argument("--audit", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    sources = json.loads(args.sources_json.read_text(encoding="utf-8"))
    if not isinstance(sources, list) or not sources or len(sources) > 30:
        raise ValueError("MANIFEST_SOURCES_INVALID")
    root = args.out.parent / "source-artifacts"
    source_args = []
    seen = set()
    for source in sources:
        if set(source) != {"run_id", "artifact_id", "artifact_name"}:
            raise ValueError("MANIFEST_SOURCE_SHAPE_INVALID")
        run_id, artifact_id, name = str(source["run_id"]), str(source["artifact_id"]), source["artifact_name"]
        if not run_id.isdigit() or not artifact_id.isdigit() or not isinstance(name, str) or not re.fullmatch(r"[a-z0-9-]{1,80}", name) or run_id in seen:
            raise ValueError("MANIFEST_SOURCE_ID_INVALID")
        seen.add(run_id)
        info = json.loads(run("gh", "api", f"repos/Nylon1/CurtainsUK/actions/artifacts/{artifact_id}"))
        if info["id"] != int(artifact_id) or info["name"] != name or info["workflow_run"]["id"] != int(run_id) or info["expired"]:
            raise ValueError(f"MANIFEST_SOURCE_ARTIFACT_MISMATCH_{run_id}")
        directory = root / run_id
        directory.mkdir(parents=True, exist_ok=True)
        run("gh", "run", "download", run_id, "-R", "Nylon1/CurtainsUK", "-n", name, "-D", str(directory))
        source_args.extend(["--source", f"{run_id}:{artifact_id}:{directory}"])
    args.out.parent.mkdir(parents=True, exist_ok=True)
    run(sys.executable, str(Path(__file__).with_name("curtainsuk-partial-hybrid-master-manifest.py")), "--audit", str(args.audit), "--out", str(args.out), *source_args)
    (args.out.parent / "sources.json").write_text(json.dumps(sources, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"manifest": str(args.out), "sources": len(sources)}))


if __name__ == "__main__":
    main()
