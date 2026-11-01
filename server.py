"""
UpcharAI Standalone Server Launcher
Runs the complete FastAPI application and REST API on Uvicorn.
CT BuildFest 2.0 · CTBF-AI-02
"""

import os
import sys
from pathlib import Path
import uvicorn

DIRECTORY = os.path.dirname(os.path.abspath(__file__))
if DIRECTORY not in sys.path:
    sys.path.insert(0, DIRECTORY)

from api.db import init_db, get_connection
from seed.seed_data import seed_database


def ensure_initialized():
    init_db()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM patients")
    count = cur.fetchone()[0]
    conn.close()
    if count == 0:
        seed_database()


def main():
    ensure_initialized()
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass

    print("=" * 70)
    print("  UPCHARAI - AI Triage Assistant for Rural Health Centres")
    print("  CT BuildFest 2.0 · CTBF-AI-02 · AI & Intelligent Systems")
    print("=" * 70)
    print(f"  FastAPI Server + REST API:    http://127.0.0.1:{port}/")
    print(f"  Swagger / OpenAPI Docs:       http://127.0.0.1:{port}/docs")
    print(f"  Web UI Interface:             http://127.0.0.1:{port}/ui")
    print("=" * 70)
    print("  Demo Accounts:")
    print("    - Clinician: doctor / doctor123")
    print("    - Triage Nurse: staff / staff123")
    print("    - Patient / Citizen: user / user123 (or patient / user123)")
    print("=" * 70)
    uvicorn.run("api.main:app", host="127.0.0.1", port=port, reload=False)


if __name__ == "__main__":
    main()
