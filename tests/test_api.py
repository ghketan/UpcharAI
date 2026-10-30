"""
API contract & security tests for UpcharAI
CTBF-AI-02 · Revision: REV-001
Verifies VM-04, VM-07, VM-11, VM-21
"""

import unittest
import urllib.request
import urllib.error
import json
import os

BASE_URL = "http://localhost:8000"

def post_json(path: str, data: dict, role: str = "NURSE"):
    url = f"{BASE_URL}{path}"
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={
        "Content-Type": "application/json",
        "X-Demo-Role": role
    })
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, json.loads(res.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def get_json(path: str, role: str = "NURSE"):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, headers={
        "X-Demo-Role": role
    })
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, json.loads(res.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

class TestUpcharApi(unittest.TestCase):
    def setUp(self):
        post_json("/api/demo/reset", {})

    def test_get_queue(self):
        status, data = get_json("/api/queue")
        self.assertEqual(status, 200)
        self.assertIn("items", data)
        self.assertEqual(len(data["items"]), 4)
        # Top patient must be EMERGENCY
        self.assertEqual(data["items"][0]["effective_priority"], "EMERGENCY")

    def test_vm_04_implausible_value_requires_confirm(self):
        # SpO2 = 150 must be rejected with 422 implausible_value_needs_confirmation
        status, res = post_json("/api/patients", {
            "age": 45,
            "sex": "M",
            "vitals": {
                "spo2": 150, # Implausible!
                "sbp": 120,
                "dbp": 80,
                "pulse": 80,
                "temp_c": 37.0
            }
        })
        self.assertEqual(status, 422)
        self.assertEqual(res["code"], "implausible_value_needs_confirmation")
        self.assertTrue(res["retryable"])

        # When confirm_implausible is True, it must succeed
        status, res = post_json("/api/patients", {
            "age": 45,
            "sex": "M",
            "vitals": {
                "spo2": 150,
                "sbp": 120,
                "dbp": 80,
                "pulse": 80,
                "temp_c": 37.0,
                "confirm_implausible": True
            }
        })
        self.assertEqual(status, 201)
        self.assertIn("patient_id", res)

    def test_vm_07_and_vm_21_role_enforcement(self):
        status, queue = get_json("/api/queue")
        top_item = queue["items"][0]
        assessment_id = top_item["assessment_id"]

        # Nurse trying to finalise must get 403 (role_forbidden)
        status, res = post_json(f"/api/assessments/{assessment_id}/finalise", {
            "final_priority": "ROUTINE",
            "reason": "Doctor review override"
        }, role="NURSE")
        self.assertEqual(status, 403)
        self.assertEqual(res["code"], "role_forbidden")

        # Doctor finalising with downgrade without rationale must get 422 (reason_required)
        status, res = post_json(f"/api/assessments/{assessment_id}/finalise", {
            "final_priority": "ROUTINE",
            "reason": "" # Empty reason on override!
        }, role="DOCTOR")
        self.assertEqual(status, 422)
        self.assertEqual(res["code"], "reason_required")

        # Doctor finalising with clinical rationale must succeed (200)
        status, res = post_json(f"/api/assessments/{assessment_id}/finalise", {
            "final_priority": "ROUTINE",
            "reason": "False alarm upon clinical exam"
        }, role="DOCTOR")
        self.assertEqual(status, 200)
        self.assertEqual(res["state"], "FINALISED")

    def test_escalation_rules(self):
        status, queue = get_json("/api/queue")
        routine_item = next(item for item in queue["items"] if item["effective_priority"] == "ROUTINE")
        assessment_id = routine_item["assessment_id"]

        # Nurse escalating upward from ROUTINE to EMERGENCY with reason succeeds
        status, res = post_json(f"/api/assessments/{assessment_id}/escalate", {
            "to_priority": "EMERGENCY",
            "reason": "Patient suddenly collapsed"
        }, role="NURSE")
        self.assertEqual(status, 200)
        self.assertEqual(res["to_priority"], "EMERGENCY")

        # Escalating downwards or to same priority fails with 409
        status, res = post_json(f"/api/assessments/{assessment_id}/escalate", {
            "to_priority": "URGENT",
            "reason": "Invalid downgrade"
        }, role="NURSE")
        self.assertEqual(status, 409)

if __name__ == "__main__":
    unittest.main()
