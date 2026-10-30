"""
UpcharAI Server & REST API
CT BuildFest 2.0 · CTBF-AI-02
Conforms to 03-architecture-data-api.md §4
"""

import http.server
import socketserver
import os
import sys
import json
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, Any, Optional

DIRECTORY = os.path.dirname(os.path.abspath(__file__))
if DIRECTORY not in sys.path:
    sys.path.insert(0, DIRECTORY)

from api.db import (
    init_db, reset_and_seed_db, get_live_queue, create_patient_with_assessment,
    escalate_assessment, finalise_assessment, get_connection, seed_canonical_scenarios
)
from engine.triage import evaluate_triage, check_plausibility

PORT = 8000

class UpcharFullHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Demo-Role, Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Connection', 'close')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json(self, status_code: int, data: Any):
        body = json.dumps(data, indent=2).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, status_code: int, code: str, message: str, retryable: bool = False):
        self.send_json(status_code, {
            "code": code,
            "message": message,
            "retryable": retryable
        })

    def get_role(self) -> str:
        role = self.headers.get("X-Demo-Role", "NURSE").upper()
        return role if role in ("NURSE", "DOCTOR") else "NURSE"

    def read_json_body(self) -> Optional[Dict[str, Any]]:
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            return {}
        try:
            raw = self.rfile.read(content_length).decode('utf-8')
            return json.loads(raw)
        except Exception:
            return None

    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        path = url.path.rstrip('/')

        # Root redirect
        if path == "" or path == "/":
            self.send_response(302)
            self.send_header('Location', '/ui/index.html')
            self.end_headers()
            return

        # 1. GET /api/queue
        if path == "/api/queue":
            queue = get_live_queue()
            self.send_json(200, {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "items": queue
            })
            return

        # 2. GET /api/hospitals
        if path == "/api/hospitals":
            hosp_file = os.path.join(DIRECTORY, "hospitals", "hospitals.json")
            if os.path.exists(hosp_file):
                with open(hosp_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self.send_json(200, data)
            else:
                self.send_json(200, [])
            return

        # 3. GET /api/sync/status
        if path == "/api/sync/status":
            conn = get_connection()
            cur = conn.cursor()
            cur.execute("SELECT state, count(*) as cnt FROM sync_outbox GROUP BY state;")
            rows = {r["state"]: r["cnt"] for r in cur.fetchall()}
            conn.close()
            self.send_json(200, {
                "online": True,
                "pending": rows.get("PENDING", 0),
                "sent": rows.get("SENT", 0),
                "failed": rows.get("FAILED", 0),
                "last_success_at": datetime.now(timezone.utc).isoformat(),
                "target_label": "Local Instance Sync"
            })
            return

        # 4. GET /api/patients/{id}
        if path.startswith("/api/patients/"):
            patient_id = path.split("/")[3]
            conn = get_connection()
            cur = conn.cursor()
            cur.execute("SELECT * FROM patient WHERE id = ?;", (patient_id,))
            p = cur.fetchone()
            if not p:
                conn.close()
                self.send_error_json(404, "patient_not_found", "Patient record not found")
                return

            cur.execute("SELECT * FROM assessment WHERE patient_id = ? ORDER BY seq ASC;", (patient_id,))
            assessments = []
            for a in cur.fetchall():
                cur.execute("SELECT * FROM finding WHERE assessment_id = ?;", (a["id"],))
                findings = [dict(f) for f in cur.fetchall()]
                cur.execute("SELECT * FROM escalation WHERE assessment_id = ?;", (a["id"],))
                escalations = [dict(e) for e in cur.fetchall()]
                cur.execute("SELECT * FROM finalisation WHERE assessment_id = ?;", (a["id"],))
                finalisations = [dict(fn) for fn in cur.fetchall()]

                item = dict(a)
                item["inputs"] = json.loads(a["inputs_json"])
                item["findings"] = findings
                item["escalations"] = escalations
                item["finalisations"] = finalisations
                assessments.append(item)

            conn.close()
            patient_dict = dict(p)
            patient_dict["history_codes"] = json.loads(p["history_codes"])
            self.send_json(200, {
                "patient": patient_dict,
                "assessments": assessments
            })
            return

        # Fallback to serving static files
        super().do_GET()

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        path = url.path.rstrip('/')
        role = self.get_role()
        body = self.read_json_body()

        if body is None:
            self.send_error_json(400, "malformed_json", "Invalid JSON payload")
            return

        # 1. POST /api/demo/reset
        if path == "/api/demo/reset":
            reset_and_seed_db()
            self.send_json(200, {
                "status": "success",
                "message": "Database reset and seeded with canonical scenarios."
            })
            return

        # 2. POST /api/patients
        if path == "/api/patients":
            age = body.get("age")
            sex = body.get("sex", "OTHER")
            pregnant = bool(body.get("pregnant", False))
            history_codes = body.get("history_codes") or []
            vitals = body.get("vitals") or {}

            # Plausibility check
            valid, implausible = check_plausibility({**vitals, "age": age})
            if not valid and not vitals.get("confirm_implausible", False):
                self.send_json(422, {
                    "code": "implausible_value_needs_confirmation",
                    "message": "One or more vital measurements are outside standard physiological bounds.",
                    "implausible": implausible,
                    "retryable": True
                })
                return

            res = create_patient_with_assessment(
                {"age": age, "sex": sex, "pregnant": pregnant, "history_codes": history_codes},
                vitals,
                role=role
            )
            self.send_json(201, res)
            return

        # 3. POST /api/assessments/{id}/escalate
        if path.endswith("/escalate") and path.startswith("/api/assessments/"):
            assessment_id = path.split("/")[3]
            to_priority = body.get("to_priority")
            reason = body.get("reason", "")
            try:
                esc = escalate_assessment(assessment_id, to_priority, reason, role=role)
                self.send_json(200, esc)
            except ValueError as ve:
                self.send_error_json(409, "not_an_escalation", str(ve))
            except Exception as e:
                self.send_error_json(500, "internal_error", str(e))
            return

        # 4. POST /api/assessments/{id}/finalise
        if path.endswith("/finalise") and path.startswith("/api/assessments/"):
            assessment_id = path.split("/")[3]
            final_priority = body.get("final_priority")
            reason = body.get("reason", "")
            try:
                fin = finalise_assessment(assessment_id, final_priority, reason, role=role)
                self.send_json(200, fin)
            except PermissionError as pe:
                self.send_error_json(403, "role_forbidden", str(pe))
            except ValueError as ve:
                self.send_error_json(422, "reason_required", str(ve))
            except Exception as e:
                self.send_error_json(500, "internal_error", str(e))
            return

        # 5. POST /api/sync/push
        if path == "/api/sync/push":
            conn = get_connection()
            cur = conn.cursor()
            cur.execute("UPDATE sync_outbox SET state = 'SENT', attempts = attempts + 1 WHERE state = 'PENDING';")
            updated = cur.rowcount
            conn.commit()
            conn.close()
            self.send_json(200, {
                "synced_count": updated,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            return

        self.send_error_json(404, "endpoint_not_found", f"POST endpoint '{path}' not found")

def main():
    os.chdir(DIRECTORY)
    init_db()

    # Seed if database is new
    queue = get_live_queue()
    if len(queue) == 0:
        seed_canonical_scenarios()

    port = PORT
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass

    socketserver.ThreadingTCPServer.allow_reuse_address = True
    try:
        with socketserver.ThreadingTCPServer(("", port), UpcharFullHandler) as httpd:
            print("=" * 70)
            print("  UPCHARAI - AI Triage Assistant for Rural Health Centres")
            print("  CT BuildFest 2.0 · CTBF-AI-02 · AI & Intelligent Systems")
            print("=" * 70)
            print(f"  Server + REST API running locally at: http://localhost:{port}/")
            print(f"  Open UI directly at: http://localhost:{port}/ui/index.html")
            print("=" * 70)
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping UpcharAI server...")
        sys.exit(0)

if __name__ == "__main__":
    main()
