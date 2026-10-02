"""Offline checks for accepted shared-design source artifacts."""

import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from curtainsuk_partial_hybrid_seed_source import validated_seed_groups


class SeedSourceTests(unittest.TestCase):
    def write(self, root, relative, value):
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value), encoding="utf-8")

    def make_source(self, root, failed=False, failure_error="PILOT_OPENAI_RESPONSE_520"):
        groups = [
            {"supplier_id": "PT", "design_id": "design-1", "affected_fabric_ids": ["pt-1"],
             "design_seed_source_fabric_id": "pt-1", "design_only_reuse_targets_by_fabric": {"pt-2": ["character"]}},
            {"supplier_id": "SDG", "design_id": "design-2", "affected_fabric_ids": ["sdg-1"],
             "design_seed_source_fabric_id": "sdg-1", "design_only_reuse_targets_by_fabric": {}},
        ]
        failures = ([{"design_id": "design-2", "affected_fabric_ids": ["sdg-1"],
                      "failure_class": "OTHER", "error": failure_error}] if failed else [])
        self.write(root, "selection.json", {"selection_subtype": "design-seed", "expected_openai_requests": 2,
                                             "pilot_b": groups})
        self.write(root, "summary.json", {"production_database_writes": 0,
                                           "total_known_fields_changed_outside_requested_delta": 0,
                                           "total_openai_requests": 2, "failures": failures,
                                           "pilot_b": {"success": 1 if failed else 2,
                                                       "failed": len(failures), "schema_failures": 0,
                                                       "local_validation_failures": 0,
                                                       "patch_new_value_invalid": 0,
                                                       "patches_accepted": 2 if failed else 3}})
        for fabric_id in (["pt-1", "pt-2"] if failed else ["pt-1", "pt-2", "sdg-1"]):
            self.write(root, f"fabrics/{fabric_id}.json", {"fabric_id": fabric_id,
                       "known_fields_changed_outside_requested_delta": 0,
                       "model": "gpt-5.6-terra", "reasoning": "medium"})
        for index in range(1 if failed else 2):
            self.write(root, f"raw/B-{index + 1}.json", {"raw_structured_output": {}})
        if not failed:
            self.write(root, "verification.json", {"verdict": "CLEAN"})

    def test_clean_seed_covers_every_design(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self.make_source(root)
            _, groups = validated_seed_groups(root)
            self.assertEqual(len(groups), 2)

    def test_external_failure_preserves_only_accepted_designs(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self.make_source(root, failed=True)
            _, groups = validated_seed_groups(root)
            self.assertEqual(set(groups), {("PT", "design-1")})

    def test_material_failure_cannot_be_used_as_source(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self.make_source(root, failed=True, failure_error="PILOT_APPROVED_IMAGE_MISSING")
            with self.assertRaisesRegex(ValueError, "DESIGN_SOURCE_FAILURE_NOT_EXTERNAL"):
                validated_seed_groups(root)


if __name__ == "__main__":
    unittest.main()
