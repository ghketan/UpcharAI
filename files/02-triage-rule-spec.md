# 02 — Triage Rule Specification

| Field | Value |
|---|---|
| Revision | REV-001 |
| Purpose | Canonical definition of inputs, scoring, rules, flags, priority derivation, queue order and the test oracle |
| Canonical IDs | Rule IDs (`NW-*`, `RF-*`, `FLOOR-*`); flag names INCOMPLETE, NEEDS_REVIEW, UNDERSTATED; EV-1, EV-2 evidence labels |
| Dependencies | DEC-002, DEC-003, DEC-006, DEC-011; 03 (data model) |
| Repository baseline | NOT INSPECTED |
| Unresolved items | RISK-001, RISK-002, RISK-008 |
| Supersedes | The placeholder thresholds in the earlier v2.0 playbook (never approved) |

> **Evidence boundary.** The NEWS2 band scores for SpO₂ (scale 1), systolic BP, pulse and temperature, and the aggregate triggers (5 and 7), were read from NHS/RCP-derived guidance on 2026-10-30 (EV-1, `VERIFIED`). The respiratory-rate scores, alertness scoring, the oxygen item and the "single parameter scoring 3" trigger come from secondary or garbled sources and are `INFERRED`: a reviewer must check them against the RCP chart before release (VM-02). Everything marked `ASSUMED` is a clinician-confirmation item. **None of this is clinically validated** (NON-006).

## 1. Inputs and plausibility bounds

| Field | Type | Required for COMPLETE | Plausible range (ASSUMED engineering bounds, not clinical) |
|---|---|---|---|
| `age` | integer years | yes | 0–120 |
| `sex` | M / F / OTHER | yes | — |
| `pregnant` | boolean | no (default false, shown as "not stated" until set) | — |
| `temp_c` | decimal, 1 dp | **yes** | 30.0–45.0 |
| `sbp`, `dbp` | integer mmHg | **yes** (both) | SBP 40–300; DBP 20–200 and DBP < SBP |
| `spo2` | integer % | **yes** | 50–100 |
| `pulse` | integer bpm | **yes** | 20–250 |
| `rr` | integer breaths/min | no (scored when present) | 4–70 |
| `avpu` | A / C / V / P / U | no (scored when present) | — |
| `on_oxygen` | boolean | no (not stated is treated as room air and flagged) | — |
| `symptom_codes[]` | codes in §3 | no | — |
| `duration_days` | integer | no | 0–365 |
| `history_codes[]` | DIABETES, HYPERTENSION, HEART_DISEASE, COPD_ASTHMA, IMMUNOCOMPROMISED | no | — |
| `free_text` | string ≤ 300 chars | no | — |

A value outside its range is rejected with `implausible_value_needs_confirmation` until the operator sets `confirm_implausible = true`; the confirmation is stored (REQ-002).

## 2. NEWS2 scoring (scale 1)

Score each available parameter, then sum.

| Parameter | 3 | 2 | 1 | 0 | 1 | 2 | 3 | Evidence |
|---|---|---|---|---|---|---|---|---|
| SpO₂ % | ≤91 | 92–93 | 94–95 | ≥96 | | | | VERIFIED |
| Systolic BP | ≤90 | 91–100 | 101–110 | 111–219 | | | ≥220 | VERIFIED |
| Pulse | ≤40 | | 41–50 | 51–90 | 91–110 | 111–130 | ≥131 | VERIFIED |
| Temperature °C | ≤35.0 | | 35.1–36.0 | 36.1–38.0 | 38.1–39.0 | ≥39.1 | | VERIFIED |
| Resp. rate | ≤8 | | 9–11 | 12–20 | | 21–24 | ≥25 | bands VERIFIED, scores INFERRED |
| Alertness | | | | A | | | C/V/P/U = 3 | INFERRED |
| On oxygen | | | | No | | Yes = 2 | | INFERRED |

SpO₂ scale 2 is not used (it is for clinician-designated patients, so it is outside this tool). The aggregate is `news2_total`. `news2_params_scored` records how many of the six scored parameters were present, plus whether oxygen status was stated.

## 3. Rules

Symptom codes: `CHEST_PAIN`, `SEVERE_BREATHING_DIFFICULTY`, `BREATHING_DIFFICULTY`, `SEIZURE_ONGOING`, `SEVERE_BLEEDING`, `STROKE_SIGNS`, `SNAKEBITE_OR_POISONING`, `PREGNANCY_HEAVY_BLEEDING`, `PREGNANCY_CONVULSION`, `VOMITING_DIARRHOEA_DEHYDRATION`, `FEVER`, `ABDOMINAL_PAIN`, `SEVERE_HEADACHE`, `COUGH`, `OTHER_TEXT`.

"Abnormal vital" means a NEWS2 parameter score ≥ 2 on SpO₂, systolic BP or pulse.

### 3.1 Emergency rules

| Rule | Condition | Evidence |
|---|---|---|
| NW-E01 | `news2_total` ≥ 7 | VERIFIED |
| RF-E01 | SpO₂ ≤ 90 **or** SBP ≤ 90 | ASSUMED |
| RF-E02 | `SEVERE_BREATHING_DIFFICULTY` | ASSUMED |
| RF-E03 | `avpu` is P or U | ASSUMED |
| RF-E04 | `SEIZURE_ONGOING` | ASSUMED |
| RF-E05 | `SEVERE_BLEEDING` | ASSUMED |
| RF-E06 | `STROKE_SIGNS` | ASSUMED |
| RF-E07 | `SNAKEBITE_OR_POISONING` | ASSUMED |
| RF-E08 | `PREGNANCY_HEAVY_BLEEDING` or `PREGNANCY_CONVULSION` | ASSUMED |
| RF-E09 | `CHEST_PAIN` **and** at least one abnormal vital (the PS red-flag combination) | ASSUMED |

### 3.2 Urgent rules

| Rule | Condition | Evidence |
|---|---|---|
| NW-U01 | `news2_total` 5–6 | VERIFIED |
| NW-U02 | Any single scored parameter equals 3 | INFERRED |
| RF-U01 | `CHEST_PAIN` (when RF-E09 did not fire) | ASSUMED |
| RF-U02 | `BREATHING_DIFFICULTY` | ASSUMED |
| RF-U03 | `VOMITING_DIARRHOEA_DEHYDRATION` | ASSUMED |
| RF-U04 | `FEVER` with `duration_days` > 3 | ASSUMED |
| RF-U05 | High-risk (any history code, or age ≥ 65) **and** (temp ≥ 38.1 **or** SpO₂ ≤ 95) | ASSUMED |
| FLOOR-01 | `age` < 16 (cut-off is a clinician decision) | ASSUMED |
| FLOOR-02 | `pregnant = true` | ASSUMED |

FLOOR-01 and FLOOR-02 exist because NEWS2 is for adults and excludes obstetric patients, so the tool does not pretend the score is valid for them (DEC-006, RISK-002). Their message reads: "Outside this tool's adult scoring. Needs a clinician's judgement."

### 3.3 Flags (never change priority by themselves)

| Flag | Condition | Display |
|---|---|---|
| `INCOMPLETE` | Any of temp, SBP/DBP, SpO₂, pulse missing | "INCOMPLETE — missing: <fields>" |
| `NEEDS_REVIEW` | `free_text` non-empty or `OTHER_TEXT` selected | "Needs clinician review — unrecognised symptom text" |
| `UNDERSTATED` | Any of rr, avpu missing, or oxygen status not stated | "Score may be understated — not entered: <fields>" |

A missing parameter can only lower the NEWS2 total, which is why the third flag exists (DEC-003).

## 4. Priority derivation (REQ-003)

1. Evaluate **every** rule in §3 without short-circuiting; collect every fired rule and its observed value.
2. `priority` = the highest tier among fired rules: any Emergency rule → `EMERGENCY`; else any Urgent rule → `URGENT`; else `ROUTINE`.
3. Compute flags per §3.3. The display state is the priority plus its flags; a `ROUTINE` result never appears without its flags and the footer "Routine does not mean safe — a clinician reviews every case."
4. The function is pure: the same input and rule-set version always give the same output, ordering of findings included (sorted by tier, then rule ID).

### Effective priority (see 03 §5)

`effective_priority` = the finalised priority if the **latest** assessment is FINALISED; otherwise `max(priority, highest nurse escalation on the latest assessment)`.

## 5. Queue ordering (DEC-011, REQ-007)

Sort key, in order:

1. `effective_priority` rank: EMERGENCY, URGENT, ROUTINE.
2. Within ROUTINE only: cases with flag `INCOMPLETE` or `NEEDS_REVIEW` before unflagged cases.
3. `arrived_at` ascending (the patient's first registration time, not the assessment time, so a reassessment does not send the patient to the back).
4. `patient_id` ascending as a deterministic tie-break.

## 6. Rule configuration (REQ-013)

All values in §1–§3 live in `rules/rules.v1.yaml` with this header, and the engine reads nothing else:

```yaml
rule_set_version: "v1"
clinical_review:
  status: NONE            # NONE | REVIEWED
  reviewer: null
  date: null
age_floor: 16
news2: { ... bands from §2 ... }
rules: [ { id: NW-E01, tier: EMERGENCY, ... }, ... ]
```

Every result carries `rule_set_version` and `clinical_review.status`. The UI shows "Not clinically reviewed" whenever the status is NONE.

## 7. Worked examples (oracle for VM-01, VM-02, VM-03)

All are `PLANNED` oracle rows and must be copied into `tests/oracle.yaml` before the engine is written.

| # | Input (others normal: SBP 120, pulse 80, SpO₂ 98, temp 37.0, age 40, no rr/avpu) | NEWS2 total | Fired rules | Priority | Flags |
|---|---|---|---|---|---|
| 1 | SpO₂ 86, pulse 120, `SEVERE_BREATHING_DIFFICULTY` | 5 (SpO₂ 3, pulse 2) | RF-E01, RF-E02, NW-U01, NW-U02 | EMERGENCY | UNDERSTATED |
| 2 | `CHEST_PAIN`, SpO₂ 92, pulse 100 (age 50) | 3 (SpO₂ 2, pulse 1) | RF-E09 | EMERGENCY | UNDERSTATED |
| 3 | `CHEST_PAIN`, all vitals normal (age 50) | 0 | RF-U01 | URGENT | UNDERSTATED |
| 4 | `FEVER` 2 days, temp 38.2, age 30 | 1 | none | ROUTINE | UNDERSTATED |
| 5 | Same as 4 but SpO₂ not entered | 1 | none | ROUTINE | INCOMPLETE (missing SpO₂), UNDERSTATED |
| 6 | Age 8, vitals normal | 0 | FLOOR-01 | URGENT | UNDERSTATED |
| 7 | SpO₂ 93, pulse 112, temp 39.2, SBP 105 | 7 (2+2+2+1) | NW-E01 | EMERGENCY | UNDERSTATED |
| 8 | SpO₂ 94, pulse 95, temp 38.5, SBP 108, rr 22 | 6 (1+1+1+1+2) | NW-U01 | URGENT | UNDERSTATED |
| 9 | Pulse 135, all else normal | 3 | NW-U02 | URGENT | UNDERSTATED |
| 10 | All vitals normal, `free_text` "burning feet" | 0 | none | ROUTINE | NEEDS_REVIEW, UNDERSTATED |
| 11 | Female, pregnant, vitals normal | 0 | FLOOR-02 | URGENT | UNDERSTATED |
| 12 | `avpu` = U, all else normal | 3 | RF-E03, NW-U02 | EMERGENCY | UNDERSTATED |

Row 1 note: RF-E01 and RF-E02 both fire, so both appear in the reasons, but only the highest tier sets the priority.

## 8. Evidence labels used here

| Label | Source | Accessed | Status |
|---|---|---|---|
| EV-1 | NHS/RCP-derived NEWS2 guidance and charts (retrieved via search 2026-10-30) | 2026-10-30 | VERIFIED for the four vitals' bands and the aggregate triggers; secondary for the rest |
| EV-2 | MDN Web Speech API documentation and Microsoft Edge on-device speech documentation | 2026-10-30 | VERIFIED (see 03 §9) |
