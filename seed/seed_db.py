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

from api.db import init_db, reset_db
from seed.seed_data import seed_database


def reset_and_seed_db():
    reset_db()
    return seed_database()


def main():
    if "--reset" in sys.argv:
        print("Resetting and re-seeding UpcharAI database...")
        count = reset_and_seed_db()
        print(f"Database successfully reset and seeded ({count} scenarios).")
    else:
        init_db()
        print("UpcharAI database verified.")


if __name__ == "__main__":
    main()
