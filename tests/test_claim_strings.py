"""
Forbidden strings and claim boundaries scan
CTBF-AI-02 · Revision: REV-001
Verifies SEC-006, VM-20, C-001–C-005
"""

import unittest
import os
import re

DIRECTORY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UI_DIR = os.path.join(DIRECTORY, "ui")

FORBIDDEN_PATTERNS = [
    (r"\bclinically\s+validated\b", "Claims of clinical validation are prohibited (NON-006)."),
    (r"\bguarantee\b", "Guarantees are prohibited."),
    (r"\bfirst\s+of\s+its\s+kind\b", "Prohibited novelty hype claim."),
    (r"\baccurate\b", "Accuracy claims without clinical trial are prohibited."),
]

# Exceptions permitted only when denying the claim (e.g. "does not diagnose", "non-diagnostic", "no ambulance dispatched")
DIAGNOS_EXCEPTION = re.compile(r"(does\s+not\s+diagnose|never\s+diagnose|non-diagnostic|not\s+intended\s+to\s+diagnose)", re.IGNORECASE)
DISPATCH_EXCEPTION = re.compile(r"(no\s+(real\s+)?ambulance\s+dispatched|no\s+dispatch)", re.IGNORECASE)
NOTIFIED_EXCEPTION = re.compile(r"(no\s+(real\s+)?hospital\s+notified|not\s+notified|not\s+transmitted|no\s+ambulance\s+dispatched[,\s]+(no|or)\s+(real\s+)?hospital\s+notified)", re.IGNORECASE)
SAFE_PATIENT_EXCEPTION = re.compile(r"(routine\s+does\s+not\s+mean\s+safe|does\s+not\s+mean\s+safe|never\s+marks?\s+anyone\s+[\"']?safe)", re.IGNORECASE)

class TestForbiddenClaims(unittest.TestCase):
    def test_scan_ui_files_for_forbidden_claims(self):
        violations = []

        for root, _, files in os.walk(UI_DIR):
            for file in files:
                if file.endswith((".html", ".js", ".css")):
                    path = os.path.join(root, file)
                    rel_path = os.path.relpath(path, DIRECTORY)
                    with open(path, "r", encoding="utf-8") as f:
                        lines = f.readlines()

                    for line_num, line in enumerate(lines, 1):
                        lower_line = line.lower()

                        # Check absolute forbidden patterns
                        for pattern, reason in FORBIDDEN_PATTERNS:
                            if re.search(pattern, lower_line, re.IGNORECASE):
                                violations.append(f"{rel_path}:{line_num} - Pattern '{pattern}' found: {reason}")

                        # Check 'diagnos'
                        if "diagnos" in lower_line:
                            if not DIAGNOS_EXCEPTION.search(lower_line):
                                violations.append(f"{rel_path}:{line_num} - Unpermitted 'diagnos' reference found without disclaimer.")

                        # Check 'ambulance dispatched'
                        if "ambulance dispatched" in lower_line:
                            if not DISPATCH_EXCEPTION.search(lower_line):
                                violations.append(f"{rel_path}:{line_num} - 'ambulance dispatched' found without negative disclaimer.")

                        # Check 'hospital notified'
                        if "hospital notified" in lower_line:
                            if not NOTIFIED_EXCEPTION.search(lower_line):
                                violations.append(f"{rel_path}:{line_num} - 'hospital notified' found without negative disclaimer.")

        if violations:
            msg = "\n".join(violations)
            self.fail(f"Forbidden claim violations detected (VM-20):\n{msg}")

if __name__ == "__main__":
    unittest.main()
