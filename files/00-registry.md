# 00 — Canonical Registry

| Field | Value |
|---|---|
| Revision | REV-001 |
| Purpose | Single source of truth for IDs, authority, states and traceability |
| Canonical IDs | REQ, SEC, DEC, NON, RISK, REV, REVIEW, FINDING, SESSION |
| Dependencies | 01, 02, 03, 04 |
| Repository baseline | NOT INSPECTED (greenfield) |
| Unresolved items | Q-A to Q-E below; RISK-001, RISK-012 |
| Supersedes | none |

## 1. Project state

| Item | Value |
|---|---|
| Project | CTBF-AI-02 AI Triage Assistant for Rural Health Centres (CT BuildFest 2.0) |
| Defining value | Explained preliminary triage, clinician finalisation and a live queue, working offline |
| Lifecycle state | SPECIFICATION complete; next ASSURANCE_REVIEW |
| Assurance profile | STANDARD (triggers: multiple workflows, persistence, formal evaluation; health domain contained by phase 1 = synthetic demo) |
| Governing constraints | CTBF-AI-02 problem statement (user-pasted); CT BuildFest evaluation sheet (screenshot; "Scoring guide" section not visible) |

## 2. Revision history

| REV | Date | Parent | Decision record | Note |
|---|---|---|---|---|
| REV-001 | 2026-10-30 | none | Proposal presented 2026-10-30; user replied "start building the files". Architect **interpreted this as approval of REV-001 as presented** (DEC-001–DEC-009 and stated defaults). The user has not named the revision; if that reading is wrong, revert to AWAITING_APPROVAL | Specification package v1. The earlier Builder v2.0 playbook files are input evidence only |

## 3. Registry

| ID | Type | Statement | Authority | Source | Decision state | Evidence state | Canonical owner | Depends on | Design location | Builder session(s) | Verification | Disposition |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| REQ-001 | REQ | Form captures symptoms+duration, temp, SBP/DBP, SpO2, pulse, history, age, sex, pregnancy; optional rr, alertness, oxygen | GOVERNING_RUBRIC | CTBF-AI-02 PS | APPROVED | NOT_APPLICABLE | 02 §1 | DEC-001 | 02 §1; 01 §4 | SESSION-002 | VM-04 | ACTIVE |
| REQ-002 | REQ | Implausible values need explicit confirmation, stored, never silently accepted | USER | Team brief (S-001) | APPROVED | NOT_APPLICABLE | 02 §1 | DEC-002 | 02 §1 | SESSION-002 | VM-04 | ACTIVE |
| REQ-003 | REQ | Deterministic engine returns exactly one of Emergency/Urgent/Routine | GOVERNING_RUBRIC | CTBF-AI-02 PS | APPROVED | NOT_APPLICABLE | 02 §4 | DEC-002 | 02 §3-§4 | SESSION-001 | VM-01 | ACTIVE |
| REQ-004 | REQ | Every result shows NEWS2 scores/total and each fired rule with value | GOVERNING_RUBRIC | CTBF-AI-02 PS | APPROVED | NOT_APPLICABLE | 02 §2 | DEC-002 | 02 §2-§4; 01 §4 UI-002 | SESSION-001 | VM-02 | ACTIVE |
| REQ-005 | REQ | Red-flag combinations (incl. chest pain with abnormal SpO2/SBP/pulse) give Emergency with visible alert | GOVERNING_RUBRIC | CTBF-AI-02 PS | APPROVED | NOT_APPLICABLE | 02 §3 | DEC-002 | 02 §3 | SESSION-001 | VM-01 | ACTIVE |
| REQ-006 | REQ | INCOMPLETE / NEEDS_REVIEW / UNDERSTATED flags; never plain Routine | USER | Team brief (S-001) | APPROVED | NOT_APPLICABLE | 02 §3 | DEC-003 | 02 §3-§4 | SESSION-001 | VM-03 | ACTIVE |
| REQ-007 | REQ | Live queue ordered per rule, updating within 3 s, stale state visible | GOVERNING_RUBRIC | CTBF-AI-02 PS | APPROVED | NOT_APPLICABLE | 02 §5 | DEC-011 | 02 §5; 03 §4; 01 §4 UI-003 | SESSION-003 | VM-05 | ACTIVE |
| REQ-008 | REQ | Records persist locally; usable offline and after restart | GOVERNING_RUBRIC | CTBF-AI-02 PS | APPROVED | NOT_APPLICABLE | 03 §1 | DEC-001 | 03 §1; 03 §3 | SESSION-002 | VM-06 | ACTIVE |
| REQ-009 | REQ | Every result PRELIMINARY until a doctor finalises; role limits; persistent assist-only notice | GOVERNING_RUBRIC | CTBF-AI-02 PS; User answers 2026-10-30 | APPROVED | NOT_APPLICABLE | 03 §5 | DEC-004, DEC-005 | 03 §5; 01 §2 | SESSION-003 | VM-07 | ACTIVE |
| REQ-010 | REQ | Operator can enter an unseen judge case in <=90 s (TARGET) | GOVERNING_RUBRIC | CTBF-AI-02 PS | APPROVED | NOT_APPLICABLE | 01 §4 | DEC-001 | 01 §3-§4 | SESSION-003 | VM-08 | ACTIVE |
| REQ-011 | REQ | One-command reset and seed reproduce demo scenarios identically | USER | Team brief (S-001) | APPROVED | NOT_APPLICABLE | 03 §4 | DEC-001 | 03 §4 | SESSION-002 | VM-09 | ACTIVE |
| REQ-012 | REQ | Age <16 and pregnancy force at least Urgent with explanatory message | USER | REV-001 DEC-006 | APPROVED | NOT_APPLICABLE | 02 §3 | DEC-006 | 02 §3 | SESSION-001 | VM-01 | ACTIVE |
| REQ-013 | REQ | Rules in versioned config; version and clinical-review status on every result | USER | Team brief (S-001) | APPROVED | NOT_APPLICABLE | 02 §6 | DEC-002 | 02 §6 | SESSION-001 | VM-10 | ACTIVE |
| REQ-014 | REQ | Append-only audit; reassessment repositions queue and returns case to PRELIMINARY | USER | Team brief (S-001) | APPROVED | NOT_APPLICABLE | 03 §3 | DEC-010 | 03 §3; 03 §5 | SESSION-002 | VM-11 | ACTIVE |
| REQ-015 | REQ | Outbox sync, idempotent, state visible | GOVERNING_RUBRIC | CTBF-AI-02 PS | APPROVED | NOT_APPLICABLE | 03 §6 | DEC-007 | 03 §6 | SESSION-005 | VM-12 | ACTIVE |
| REQ-016 | REQ | Simulated SOS panel for effective-Emergency cases | USER | Team brief (S-001) | APPROVED | NOT_APPLICABLE | 03 §7 | DEC-008 | 03 §7 | SESSION-004 | VM-13 | ACTIVE |
| REQ-017 | REQ | Structured referral summary, labelled simulated | USER | Team brief (S-001) | APPROVED | NOT_APPLICABLE | 03 §7 | DEC-008 | 03 §7 | SESSION-004 | VM-13 | ACTIVE |
| REQ-018 | REQ | Accessibility basics: text beside colour, keyboard, large targets | USER | User answers 2026-10-30 | APPROVED | NOT_APPLICABLE | 01 §4 | DEC-001 | 01 §4 | SESSION-003 | VM-14 | ACTIVE |
| REQ-019 | REQ | Synthetic-data banner; no patient fields in logs or URLs | USER | Team brief (S-001) | APPROVED | NOT_APPLICABLE | 03 §10 | DEC-001 | 03 §10 | SESSION-006 | VM-15 | ACTIVE |
| REQ-020 | REQ | Plain-language findings and suggested action understandable to non-experts | USER | User answers 2026-10-30 | APPROVED | NOT_APPLICABLE | 01 §5 | DEC-004 | 01 §5 | SESSION-003 | VM-16 | ACTIVE |
| REQ-021 | REQ | Voice fills free-text symptoms only, with confirm, online-labelled (P2) | USER | Team brief (S-001) | APPROVED | VERIFIED | 03 §9 | DEC-009 | 03 §9 | SESSION-008 | VM-17 | ACTIVE |
| REQ-022 | REQ | Chatbot with deterministic red-flag pre-filter before LLM (P2) | USER | Team brief (S-001) | APPROVED | NOT_APPLICABLE | 03 §8 | DEC-009 | 03 §8 | SESSION-007 | VM-18 | ACTIVE |
| REQ-023 | REQ | Hindi and English UI strings for result card and queue (P2) | USER | Team brief (S-001) | APPROVED | NOT_APPLICABLE | 01 §4 | DEC-012 | 01 §4; 03 §8 | SESSION-007 | VM-19 | ACTIVE |
| REQ-024 | REQ | Punjabi UI/chat (if time permits) | USER | Team brief (S-001) | APPROVED | NOT_APPLICABLE | 03 §2 | DEC-012 | 03 §2 | none | VM-24 | DEFERRED |
| REQ-025 | REQ | Claim sheet, judge Q&A and labelled fallback recording matching evidence | GOVERNING_RUBRIC | Evaluation Sheet (scoring guide not seen) | APPROVED | NOT_APPLICABLE | 04 §5 | DEC-008 | 04 §5; 01 §5 | SESSION-006 | VM-20 | ACTIVE |
| SEC-001 | SEC | Synthetic data only; display_code instead of names; persistent banner | USER | Team brief (S-001) | APPROVED | NOT_APPLICABLE | 03 §10 | none | 03 §10 | SESSION-006 | VM-15 | ACTIVE |
| SEC-002 | SEC | No patient fields in logs, URLs or error bodies | USER | Team brief (S-001) | APPROVED | NOT_APPLICABLE | 03 §10 | none | 03 §10 | SESSION-002 | VM-15 | ACTIVE |
| SEC-003 | SEC | LLM and speech services receive only chat or dictated text, never records | USER | Team brief (S-001) | APPROVED | NOT_APPLICABLE | 03 §10 | none | 03 §8-§10 | SESSION-007 | VM-18 | ACTIVE |
| SEC-004 | SEC | Server enforces role table though header is spoofable | ARCHITECT_RECOMMENDATION | REV-001 | PROPOSED | NOT_APPLICABLE | 03 §4 | none | 03 §4; 01 §2 | SESSION-002 | VM-21 | ACTIVE |
| SEC-005 | SEC | LLM key from environment variable, never committed | ARCHITECT_RECOMMENDATION | REV-001 | PROPOSED | NOT_APPLICABLE | 03 §10 | none | 03 §10 | SESSION-006 | VM-22 | ACTIVE |
| SEC-006 | SEC | Repo test scans for forbidden claim strings | ARCHITECT_RECOMMENDATION | REV-001 | PROPOSED | NOT_APPLICABLE | 01 §5 | none | 01 §5 | SESSION-006 | VM-20 | ACTIVE |
| SEC-007 | SEC | Sync ingest only when TARGET_MODE=1 | ARCHITECT_RECOMMENDATION | REV-001 | PROPOSED | NOT_APPLICABLE | 03 §6 | none | 03 §6 | SESSION-005 | VM-23 | ACTIVE |
| DEC-001 | DEC | Local-first single-device architecture | USER | REV-001 proposal | APPROVED | NOT_APPLICABLE | 03 §1-§2 | none | 03 §1-§2 | n/a | VM-06 | ACTIVE |
| DEC-002 | DEC | NEWS2 aggregate plus clinician-confirmable red-flag rules | USER | REV-001 proposal | APPROVED | INFERRED | 02 | none | 02; 03 §2 | n/a | VM-01, VM-02, VM-25 | ACTIVE |
| DEC-003 | DEC | Four vitals required for COMPLETE; partial scores flagged | USER | REV-001 proposal | APPROVED | NOT_APPLICABLE | 02 §3 | none | 02 §3; 03 §2 | n/a | VM-03 | ACTIVE |
| DEC-004 | DEC | Clinician finalisation; PRELIMINARY until finalised | USER | REV-001 proposal | APPROVED | NOT_APPLICABLE | 03 §5 | none | 03 §5 | n/a | VM-07 | ACTIVE |
| DEC-005 | DEC | Roles are a selector, not authentication | USER | REV-001 proposal | APPROVED | NOT_APPLICABLE | 03 §2 | none | 03 §2 | n/a | VM-21 | ACTIVE |
| DEC-006 | DEC | Escalation floors for age <16, pregnancy, unrecognised text | USER | REV-001 proposal | APPROVED | INFERRED | 02 §3 | none | 02 §3; 03 §2 | n/a | VM-01, VM-08 | ACTIVE |
| DEC-007 | DEC | Sync to second local instance or labelled MOCK; synthetic data only | USER | REV-001 proposal | APPROVED | NOT_APPLICABLE | 03 §6 | none | 03 §6 | n/a | VM-12 | ACTIVE |
| DEC-008 | DEC | SOS simulated; curated hospital list | USER | REV-001 proposal | APPROVED | NOT_APPLICABLE | 03 §7 | none | 03 §7 | n/a | VM-13 | ACTIVE |
| DEC-009 | DEC | Chatbot isolated and pre-filtered; voice optional | USER | REV-001 proposal | APPROVED | VERIFIED | 03 §8-§9 | none | 03 §8-§9 | n/a | VM-17, VM-18 | ACTIVE |
| DEC-010 | DEC | Patients immutable; append-only records | ARCHITECT_RECOMMENDATION | REV-001 proposal | PROPOSED | NOT_APPLICABLE | 03 §3 | none | 03 §3 | n/a | VM-11 | ACTIVE |
| DEC-011 | DEC | Queue ordering per 02 §5 | ARCHITECT_RECOMMENDATION | REV-001 proposal | PROPOSED | NOT_APPLICABLE | 02 §5 | none | 02 §5 | n/a | VM-05 | ACTIVE |
| DEC-012 | DEC | Cut order if behind schedule; P0 never cut | ARCHITECT_RECOMMENDATION | REV-001 proposal | PROPOSED | NOT_APPLICABLE | 03 §2 | none | 03 §2 | n/a | process (no test) | ACTIVE |
| NON-001 | NON | Phase 2 deployment / real data | USER | REV-001 / user answers | APPROVED | NOT_APPLICABLE | 01 §6 | none | 01 §6 | none | n/a (non-goal) | ACTIVE |
| NON-002 | NON | Diagnosis, treatment, dosing | USER | REV-001 / user answers | APPROVED | NOT_APPLICABLE | 01 §6 | none | 01 §6 | none | n/a (non-goal) | ACTIVE |
| NON-003 | NON | Real dispatch or notification | USER | REV-001 / user answers | APPROVED | NOT_APPLICABLE | 01 §6 | none | 01 §6 | none | n/a (non-goal) | ACTIVE |
| NON-004 | NON | Training any ML model | USER | REV-001 / user answers | APPROVED | NOT_APPLICABLE | 01 §6 | none | 01 §6 | none | n/a (non-goal) | ACTIVE |
| NON-005 | NON | Real authentication | USER | REV-001 / user answers | APPROVED | NOT_APPLICABLE | 01 §6 | none | 01 §6 | none | n/a (non-goal) | ACTIVE |
| NON-006 | NON | Clinical validation or claim of it | USER | REV-001 / user answers | APPROVED | NOT_APPLICABLE | 01 §6 | none | 01 §6 | none | n/a (non-goal) | ACTIVE |
| NON-007 | NON | Paediatric/obstetric logic beyond floors | USER | REV-001 / user answers | APPROVED | NOT_APPLICABLE | 01 §6 | none | 01 §6 | none | n/a (non-goal) | ACTIVE |
| NON-008 | NON | Phone-installable offline app | USER | REV-001 / user answers | APPROVED | NOT_APPLICABLE | 01 §6 | none | 01 §6 | none | n/a (non-goal) | ACTIVE |
| RISK-001 | RISK | Rules/mapping not clinically reviewed | ARCHITECT_RECOMMENDATION | 04 §3 | NOT_REQUIRED | UNVERIFIED | 04 §3 | none | 04 §3 | none | VM-25 | ACTIVE |
| RISK-002 | RISK | Judge case outside NEWS2 scope or unseen text | ARCHITECT_RECOMMENDATION | 04 §3 | NOT_REQUIRED | UNVERIFIED | 04 §3 | none | 04 §3 | none | VM-08 | ACTIVE |
| RISK-003 | RISK | Sync target only a mock | ARCHITECT_RECOMMENDATION | 04 §3 | NOT_REQUIRED | UNVERIFIED | 04 §3 | none | 04 §3 | none | VM-12 | ACTIVE |
| RISK-004 | RISK | Extras built before core stable | ARCHITECT_RECOMMENDATION | 04 §3 | NOT_REQUIRED | UNVERIFIED | 04 §3 | none | 04 §3 | none | process | ACTIVE |
| RISK-005 | RISK | Demo device or Wi-Fi failure | ARCHITECT_RECOMMENDATION | 04 §3 | NOT_REQUIRED | UNVERIFIED | 04 §3 | none | 04 §3 | none | process | ACTIVE |
| RISK-006 | RISK | Voice cloud processing; Hindi on-device unsupported | ARCHITECT_RECOMMENDATION | 04 §3 | NOT_REQUIRED | VERIFIED | 04 §3 | none | 04 §3 | none | VM-17 | ACTIVE |
| RISK-007 | RISK | LLM provider/safety unverified | ARCHITECT_RECOMMENDATION | 04 §3 | NOT_REQUIRED | UNVERIFIED | 04 §3 | none | 04 §3 | none | VM-18 | ACTIVE |
| RISK-008 | RISK | Over-escalation / alert fatigue | ARCHITECT_RECOMMENDATION | 04 §3 | NOT_REQUIRED | UNVERIFIED | 04 §3 | none | 04 §3 | none | VM-08 | ACTIVE |
| RISK-009 | RISK | Partial NEWS2 understated | ARCHITECT_RECOMMENDATION | 04 §3 | NOT_REQUIRED | UNVERIFIED | 04 §3 | none | 04 §3 | none | VM-03 | ACTIVE |
| RISK-010 | RISK | Role selector spoofable | ARCHITECT_RECOMMENDATION | 04 §3 | NOT_REQUIRED | UNVERIFIED | 04 §3 | none | 04 §3 | none | VM-21 | ACTIVE |
| RISK-011 | RISK | Hindi wording errors | ARCHITECT_RECOMMENDATION | 04 §3 | NOT_REQUIRED | UNVERIFIED | 04 §3 | none | 04 §3 | none | VM-19 | ACTIVE |
| RISK-012 | RISK | Same-provider user-attested review only | ARCHITECT_RECOMMENDATION | 04 §3 | NOT_REQUIRED | UNVERIFIED | 04 §3 | none | 04 §3 | none | REVIEW-001 | ACTIVE |

## 4. Review findings

| FINDING ID | Review ID | Severity | Evidence/location | Defect and consequence | Affected IDs | Finding state | Required correction | Verification |
|---|---|---|---|---|---|---|---|---|
| none yet | REVIEW-001 (PLANNED) | — | — | — | — | — | — | — |

## 5. Assurance review record

| Field | Value |
|---|---|
| Review ID | REVIEW-001 |
| Specification revision | REV-001 |
| Required profile/mode | FRESH_CONTEXT_CRITIC (STANDARD) |
| Verdict | NOT STARTED |
| Data-handling status | BLOCKED until the user confirms the destination (04 §6) |
| Provenance status | USER-ATTESTED expected |

## 6. Provisional session map (derived from 04 §2)

| Session | Included IDs |
|---|---|
| SESSION-001 | REQ-003, REQ-004, REQ-005, REQ-006, REQ-012, REQ-013 |
| SESSION-002 | REQ-001, REQ-002, REQ-008, REQ-011, REQ-014, SEC-002, SEC-004 |
| SESSION-003 | REQ-007, REQ-009, REQ-010, REQ-018, REQ-020 |
| SESSION-004 | REQ-016, REQ-017 |
| SESSION-005 | REQ-015, SEC-007 |
| SESSION-006 | REQ-019, REQ-025, SEC-001, SEC-005, SEC-006 |
| SESSION-007 | REQ-022, REQ-023, SEC-003 |
| SESSION-008 | REQ-021 |

## 7. Unresolved decisions and questions

| Label | Item | Default in use |
|---|---|---|
| Q-A | Format and fields of judge cases (rr, avpu, pregnancy, free text) | PS vitals plus optional rr, avpu, oxygen |
| Q-B | Qualified clinical reviewer for 02 §3 and §7 (VM-25) | None; "Not clinically reviewed" |
| Q-C | Team size and hours | 3–4 people, 30 hours |
| Q-D | Remaining text of the evaluation sheet "Scoring guide" | Treated as unseen; may add mandatory conditions |
| Q-E | Confirm destination for the critic packet (new conversation, same provider) | Not issued |

## 8. Next valid action

Run the consistency checks (results below), then confirm Q-E so the critic packet can be issued.

## 9. Specification consistency check (author run, 2026-10-30)

Method: script that regenerated this registry's session and verification columns from tables in 04 and cross-checked IDs across files 00–04. A PASS means the check ran, not that the design is right.

| Check | Result |
|---|---|
| Every referenced REQ/SEC/DEC/NON/RISK/SESSION/VM ID is defined | PASS |
| Every active REQ and SEC has a design location, session and verification row | PASS |
| Registry design locations resolve to real headings | PASS |
| Every referenced rule ID is defined in 02 | PASS |
| Counts | 25 REQ, 7 SEC, 12 DEC, 8 NON, 12 RISK, 25 VM rows, 8 sessions |
| Oracle arithmetic in 02 §7 | **NOT MACHINE-CHECKED.** Totals were computed by hand; the reviewer must recompute (VM-01, VM-02) |
| NEWS2 rr, alertness, oxygen scores and the single-parameter trigger | **UNVERIFIED against the primary RCP chart** (02 §2 marks them INFERRED) |
| Evaluation-sheet "Scoring guide" | **NOT SEEN** (Q-D) |
| Independent review | **NOT RUN** (REVIEW-001 planned) |
