# 01 — Product and Acceptance

| Field | Value |
|---|---|
| Revision | REV-001 |
| Purpose | Define who uses the product, what they see, and what the UI must never imply |
| Canonical IDs | NON-001–NON-008, UI-001–UI-008 |
| Dependencies | 02 (rules), 03 (API/data), 00 (registry) |
| Repository baseline | NOT INSPECTED (greenfield; no repository exists) |
| Unresolved items | RISK-001, RISK-002 |
| Supersedes | none (the earlier v2.0 playbook files are input, not approved baseline) |

## 1. Purpose and defining value

A nurse or ASHA worker enters a patient's symptoms and vitals in about a minute and immediately sees a **preliminary** priority (Emergency, Urgent or Routine) with the reasons. A doctor sees the live queue ordered by priority and **finalises** each result. The tool assists; it never diagnoses and never marks anyone "safe". It works with no internet.

Phase 1 is a hackathon demonstrator on synthetic data, judged on judge-supplied cases. Phase 2 (real deployment) is only a possibility and is out of scope for this revision (NON-001).

## 2. Actors and roles

| Actor | Demo role value | May do | May not do |
|---|---|---|---|
| Nurse / ASHA worker | `NURSE` | Register patient, enter an assessment, **escalate** priority upward with a reason, view queue, open SOS panel | Lower a priority, finalise |
| Doctor | `DOCTOR` | Everything the nurse can, plus **finalise**: confirm the priority or set it up or down with a reason | — |
| Judge | observer | Supplies cases; the team operator enters them | Enter real patient data |

Roles in phase 1 are a **selector, not authentication** (DEC-005). The UI states this. The server still enforces the permission table (SEC-004), but the selector is trivially changeable, so it is not a security control.

## 3. Journeys and failure paths

| J-ID | Journey | Failure / recovery |
|---|---|---|
| J1 | Register → enter vitals → preliminary result with reasons → case appears in queue | Implausible value: blocked until the operator confirms. Missing required vital: result is saved and shown as INCOMPLETE, never plain Routine |
| J2 | Doctor opens a case → reviews reasons → finalises | Reassessment after finalising: new assessment is PRELIMINARY again; the older finalisation stays in history |
| J3 | Effective priority is Emergency → SOS panel → referral summary | Hospital list empty or unavailable: the panel says so and still shows the summary |
| J4 | Internet off → continue all of J1–J3 → connectivity returns → outbox syncs | Sync target unreachable: records stay PENDING and the banner says so |
| J5 | (P2) Ask the chatbot a health question | Red-flag words: fixed escalation text, no LLM call. LLM unreachable: static safety text |
| J6 | (P2) Dictate symptom text by voice | Recognition fails or is unsupported: type instead. Voice never auto-submits |

## 4. UI truth table

Every screen has a "must show" and a "must never imply" entry. These are acceptance criteria (VM-14, VM-15, VM-16, VM-20).

| UI-ID | Screen / state | Must show | Must never imply |
|---|---|---|---|
| UI-001 | Registration and vitals form | Required vs optional markers; symptom **checklist chips** (large targets) plus an optional free-text box; per-vital "not entered" state; plausibility warnings; banner "Synthetic data only — do not enter real patient details" | That an empty vital means a normal vital |
| UI-002 | Result card | Priority with text label; the four NEWS2 vitals' scores and total; every fired rule as a **plain-language sentence plus the value**; flags (INCOMPLETE, NEEDS REVIEW, SCORE MAY BE UNDERSTATED); "PRELIMINARY — awaiting clinician"; rule-set version and clinical-review status; suggested action | Diagnosis, certainty, or that Routine means safe |
| UI-003 | Live queue | Priority order; wait time since arrival; top reason; state tag (PRELIMINARY / FINALISED); flags; "last updated" time; a visible **stale** state if polling has failed for more than 6 s | That the queue is current when the last refresh failed |
| UI-004 | Patient detail and finalise panel | All assessments in order; escalations; finalisations with who and why; doctor-only Finalise control | That an older finalisation still applies after new vitals were entered |
| UI-005 | SOS / referral | "SIMULATED — no dispatch or notification occurs"; hospital name and phone with tel: link; referral summary | That anyone has been notified or an ambulance is on the way |
| UI-006 | Connectivity and sync | Online/offline; pending count; last successful sync time; target label ("demo target" or "MOCK") | That pending records have reached another system |
| UI-007 | Chatbot (P2) | "General information, not medical advice"; escalation text for red flags; "unavailable offline" state | That it assessed or diagnosed the user, or can see their record |
| UI-008 | Role selector and global footer | Current role; "Demo roles — not authentication"; persistent "Assists the clinician. A clinician makes the decision." | That the selector is a login |

## 5. Content and claim rules (REQ-020, REQ-025, SEC-006)

**Plain-language rule.** Each finding reads like: "Oxygen level is low (92%)." A short suggested action follows by priority:

| Priority | Suggested action text |
|---|---|
| Emergency | "Alert the doctor now." |
| Urgent | "Doctor should see this patient soon, before routine cases." |
| Routine | "No urgent signs found by this tool. A clinician still reviews every case." |

**Forbidden strings anywhere in the UI, docs and slides** (checked by VM-20): "clinically validated", "diagnos" (except in "does not diagnose"), "safe" applied to a patient, "ambulance dispatched", "hospital notified", "guarantee", "first of its kind", "accurate".

**Permitted claims** are listed in 04 §5 and tied to evidence.

## 6. Non-goals

| NON-ID | Non-goal |
|---|---|
| NON-001 | Phase 2 real deployment, real patient data or pilots |
| NON-002 | Diagnosis, treatment advice or medicine dosing |
| NON-003 | Real ambulance dispatch or real hospital notification |
| NON-004 | Training or fine-tuning any ML model |
| NON-005 | Real authentication and user management (phase 2) |
| NON-006 | Clinical validation of the rules, or any claim of it |
| NON-007 | Paediatric and obstetric triage logic beyond the escalation floors in DEC-006 |
| NON-008 | A phone-installable offline app (lane B in 03 §1) |
