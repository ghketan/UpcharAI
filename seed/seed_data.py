import json
from pathlib import Path
from typing import Optional

import api.config as config
from api.db import get_db, record_outbox
from engine.config import load_config
from engine.models import AssessmentInputs
from engine.triage import evaluate_triage
from seed.scenarios import SCENARIOS


def seed_database(db_path: Optional[Path] = None) -> int:
    path = db_path or config.DB_PATH
    rule_cfg = load_config()
    seeded_count = 0

    with get_db(path) as conn:
        for item in SCENARIOS:
            p = item["patient"]
            a = item["assessment"]

            # Insert patient
            conn.execute(
                """
                INSERT OR REPLACE INTO patients (id, display_code, age, sex, pregnant, arrived_at, created_by_role)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    p["id"],
                    p["display_code"],
                    p["age"],
                    p["sex"],
                    1 if p["pregnant"] else 0,
                    p["arrived_at"],
                    p["created_by_role"],
                ),
            )
            conn.execute(
                """
                INSERT OR REPLACE INTO sync_outbox (id, entity, entity_id, payload_json, state, attempts, created_at)
                VALUES (?, 'patient', ?, ?, 'PENDING', 0, ?)
                """,
                (f"outbox_patient_{p['id']}", p["id"], json.dumps(p), p["arrived_at"]),
            )

            # Evaluate triage
            inputs = AssessmentInputs(
                age=p["age"],
                sex=p["sex"],
                pregnant=p["pregnant"],
                temp_c=a["temp_c"],
                sbp=a["sbp"],
                dbp=a["dbp"],
                spo2=a["spo2"],
                pulse=a["pulse"],
                rr=a["rr"],
                avpu=a["avpu"],
                on_oxygen=a["on_oxygen"],
                symptom_codes=a["symptom_codes"],
                duration_days=a["duration_days"],
                history_codes=a["history_codes"],
                free_text=a["free_text"],
                confirm_implausible=a["confirm_implausible"],
            )
            triage_res = evaluate_triage(inputs, rule_cfg)

            # Insert assessment
            inputs_json = json.dumps({
                "age": p["age"],
                "sex": p["sex"],
                "pregnant": p["pregnant"],
                "temp_c": a["temp_c"],
                "sbp": a["sbp"],
                "dbp": a["dbp"],
                "spo2": a["spo2"],
                "pulse": a["pulse"],
                "rr": a["rr"],
                "avpu": a["avpu"],
                "on_oxygen": a["on_oxygen"],
                "symptom_codes": a["symptom_codes"],
                "duration_days": a["duration_days"],
                "history_codes": a["history_codes"],
                "free_text": a["free_text"],
            })

            conn.execute(
                """
                INSERT OR REPLACE INTO assessments (
                    id, patient_id, seq, inputs_json, confirmed_implausible,
                    news2_total, news2_params_scored, priority, flags_json,
                    missing_json, rule_set_version, clinical_review_status,
                    suggested_action, created_at, role
                ) VALUES (?, ?, 1, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    a["id"],
                    p["id"],
                    inputs_json,
                    triage_res.news2.total,
                    triage_res.news2.params_scored,
                    triage_res.priority.value,
                    json.dumps(triage_res.flags),
                    json.dumps(triage_res.missing),
                    triage_res.rule_set_version,
                    triage_res.clinical_review_status,
                    triage_res.suggested_action,
                    a["created_at"],
                    a["role"],
                ),
            )

            # Insert findings
            for idx, f in enumerate(triage_res.findings):
                f_id = f"{a['id']}_f_{idx}"
                conn.execute(
                    """
                    INSERT OR REPLACE INTO findings (id, assessment_id, rule_id, tier, plain_message, observed_value)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (f_id, a["id"], f.rule_id, f.tier.value, f.plain_message, f.observed_value),
                )

            assessment_outbox_payload = {
                "id": a["id"],
                "patient_id": p["id"],
                "priority": triage_res.priority.value,
                "news2_total": triage_res.news2.total,
            }
            conn.execute(
                """
                INSERT OR REPLACE INTO sync_outbox (id, entity, entity_id, payload_json, state, attempts, created_at)
                VALUES (?, 'assessment', ?, ?, 'PENDING', 0, ?)
                """,
                (f"outbox_assessment_{a['id']}", a["id"], json.dumps(assessment_outbox_payload), a["created_at"]),
            )
            seeded_count += 1

    return seeded_count


if __name__ == "__main__":
    from api.db import init_db
    init_db()
    count = seed_database()
    print(f"Seeded {count} scenarios successfully.")
