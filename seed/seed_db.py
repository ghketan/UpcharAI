"""
UpcharAI Database Seeding & Reset Utility
CTBF-AI-02 · Revision: REV-001
Usage: python seed/seed_db.py [--reset]
"""

import sys
import os

DIRECTORY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if DIRECTORY not in sys.path:
    sys.path.insert(0, DIRECTORY)

from api.db import init_db, reset_and_seed_db, get_live_queue

def main():
    if "--reset" in sys.argv:
        print("Resetting and re-seeding UpcharAI database...")
        reset_and_seed_db()
        print("Database successfully reset and seeded.")
    else:
        init_db()
        queue = get_live_queue()
        print(f"UpcharAI database verified. Current active queue size: {len(queue)}")

if __name__ == "__main__":
    main()
