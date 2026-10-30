# CTBF-AI-02 Rural Triage Assistant — Implementation Playbook

**File 1 of 3: Decision, Scope, Evidence and Requirements**

| Field | Value |
|---|---|
| Playbook version | 0.1 (candidate) |
| Mode / Tier / Maturity | GREENFIELD / **M (compact)** / hackathon demonstrator |
| Tier basis | A 30-hour hackathon would normally be S. Tier M is chosen because three modules are triggered at P0/P1 depth: regulated health domain, offline-first and AI. The playbook is deliberately compact; it makes no L/XL completeness claim. |
| Decision enabled | Start building now, with a clear P0 cut line and an honest claim boundary |
| Audience | Builders (team), with judge-facing claim limits in Chapter 6 |
| Companion files | `02-architecture-and-triage-spec.md`, `03-delivery-tests-risks-dod.md`, `playbook-registry.yaml` |

---

## 1. Decision brief

**Recommendation: CONDITIONAL GO.**

The core (form → deterministic rules → explained priority → live queue → local records) is technically small and buildable in 30 hours. Three conditions must be met first:

1. **Clinical thresholds are placeholders.** Every number in the rule set (file 2) is `ASSUMED`. A person with clinical training must review them before the demo (G-001). No threshold may be called validated.
2. **Judge-supplied cases are the demo (S-002).** The official problem statement says the app is "demonstrated on judge-supplied patient cases". Our own four scripted scenarios (S-001) are rehearsal only. The system must therefore handle unseen cases, including fields we did not plan for, without showing false reassurance (K-002, R-006).
3. **Offline architecture must be settled in hour 0.** The brief says the engine is Python/FastAPI and also says triage works offline. These only fit together if FastAPI and SQLite run on the local device (D-001). See file 2.

**Top five requirements:** R-003 deterministic triage, R-004 visible reasons, R-005 red-flag combinations, R-007 live priority queue, R-008 local records offline.

**First two weeks:** not applicable. The first 30 hours are in file 3, Chapter 2.

## 2. Capability declaration and evidence inventory

| Capability | Status | Note |
|---|---|---|
| File read/write | AVAILABLE | Used for this playbook |
| Code execution | AVAILABLE | Used only for the registry audit (file 3) |
| Web research | AVAILABLE, **not used** | No clinical or regulatory source was retrieved. Hence G-002 |
| Repository / UI inspection | UNAVAILABLE | No repository exists (greenfield) |
| Independent reviewer | UNAVAILABLE | All audits here are **self-review** |

| S-ID | Source | Evidence axis |
|---|---|---|
| S-001 | Team project brief (uploaded `.md`) | USER_PROVIDED |
| S-002 | Official problem statement CTBF-AI-02 (pasted) | USER_PROVIDED |
| S-003 | Playbook Builder v2.0 prompt (governing instructions) | USER_PROVIDED |

No external source has been read. Every clinical statement in this playbook is therefore `ASSUMED` until G-002 is closed.

## 3. Problem and users

**Problem (S-002):** Primary Health Centres (PHCs) have long queues, one doctor and limited staff. Critical patients wait behind routine ones.

| Actor | Goal | Constraint |
|---|---|---|
| Nurse / ASHA worker (primary operator) | Register a patient in about a minute and know who to escalate | Little time, possibly low typing comfort, variable language |
| Doctor (consumer of the queue) | See who needs attention first and why | Makes every clinical decision, never the tool |
| Judge (demo audience) | Enter or supply a case and watch the system respond | Unseen cases, limited time, may try to break it |
| Administrator (optional) | Maintain the hospital directory and rule config | Not needed for the demo |

**Primary journeys:** (J1) register → vitals → result with reasons → queue. (J2) Emergency → SOS/referral summary. (J3) Re-measure vitals → reassess → queue repositions. (J4) Internet off → continue working → sync later. (J5) Ask the chatbot a basic health question in Hindi or English.

## 4. Scope, priorities and non-goals

**P0 means required for the next checkpoint and blocks the demo. P1 is required for the stated target. P2 is conditional on P0/P1 being stable.**

| Tier | Contents |
|---|---|
| P0 | Registration and vitals form, deterministic rules, reasons, red-flag combos, missing-data handling, live priority queue, local persistence, disclaimer, repeatable demo seeding, fast case entry |
| P1 | Externalised versioned rules, sync outbox, SOS/referral (simulated), audit trail and reassessment, privacy hygiene, accessibility basics, paediatric floor |
| P2 | Voice input, multilingual chatbot, localized UI strings |

**Scope note:** the problem statement asks for "a simple form **or** voice". A form alone satisfies it, so voice stays P2. The SOS, hospital and chatbot features are not in S-002. They are differentiators from S-001 and are cut first if time runs short (D-012).

**Non-goals:** diagnosis, prescribing, real ambulance dispatch, real hospital notification, training an ML model, real patient data, paediatric or obstetric validation, production deployment.

## 5. Assumptions and open questions

| ID | Statement | Impact if false | Owner / status |
|---|---|---|---|
| A-001 | Team of 3–4 with at least one Python and one React developer | Cut P1 earlier; chatbot drops | Team lead / ASSUMED |
| A-002 | Demo scope is adult triage. Age under 12 triggers a floor of Urgent with banner (R-022) | Paediatric thresholds would be needed | Clinical reviewer / ASSUMED |
| A-003 | Rule thresholds are placeholders pending clinical review | Classifications can mislead | Clinical reviewer / ASSUMED |
| A-004 | Judges give cases as text or paper, and an operator keys them in | If judges type directly, UI speed matters more | Team lead / ASSUMED |
| A-005 | Demo is on one laptop; offline is shown by turning Wi-Fi off | A second device needs a second instance | Team lead / ASSUMED |
| A-006 | An LLM API key and credit are available for the chatbot | Chatbot is dropped | Team lead / ASSUMED |
| A-007 | Hackathon window is 30 hours; calendar date is UNKNOWN | Schedule table is relative only | Organisers / ASSUMED |

| ID | Question | Blocks | Owner |
|---|---|---|---|
| Q-001 | What format and fields will judge cases have (respiratory rate, GCS, age, pregnancy, free text)? Ask the organisers. | Form schema, K-002 | Team lead |
| Q-002 | What does "sync" target in the demo: a second local instance or a mock endpoint? | R-012, claim C-004 | Backend lead |
| Q-003 | Who is the clinical reviewer, even informally (doctor, nursing or medical student)? | G-001, demo claims | Team lead |
| Q-004 | Does offline need to run on an ASHA worker's phone or only on a PHC desk device? | D-001 | Team lead |
| Q-005 | Is Punjabi required, or only Hindi and English? | R-019, R-017 | Team lead |

## 6. Claim boundaries

| C-ID | Permitted claim | Status | Cannot prove |
|---|---|---|---|
| C-001 | "With rule set vX, the app classifies the seeded and entered cases deterministically and shows the findings that triggered each classification." | TARGET | That the thresholds are clinically correct |
| C-002 | "Registration, triage, queue and record viewing run with internet disabled on the demo device." | TARGET | Behaviour on other devices or networks |
| C-003 | "SOS shows a *simulated* hospital directory and a prepared referral summary." | TARGET | Any dispatch, notification or real hospital availability |
| C-004 | "Records created offline are queued and synced to a named demo target when connectivity returns." | TARGET (blocked by Q-002) | Multi-device conflict handling at scale |
| C-005 | "The chatbot gives general health information and escalates serious descriptions." | TARGET | Medical correctness of free-form answers |

**Never say:** clinically validated, diagnoses, replaces the doctor, guarantees safety, "AI-powered diagnosis", ambulance dispatched, hospital notified. A `Routine` result is **not** proof that a patient is safe.

## 7. Requirements

All requirements come from S-001 and S-002. All have delivery status `PLANNED` and evidence axis `USER_PROVIDED`.

| R-ID | Requirement | Pri | D | T |
|---|---|---|---|---|
| R-001 | Form captures symptoms with duration, temperature, BP (systolic and diastolic), SpO₂, pulse, history, age and sex | P0 | D-001, D-005 | T-005, T-017 |
| R-002 | Implausible values (e.g. SpO₂ 150) require explicit operator confirmation and are never silently accepted or dropped | P0 | D-002 | T-005 |
| R-003 | Triage returns exactly one of Emergency / Urgent / Routine, deterministically (same input and rule set give the same output) | P0 | D-002 | T-001, T-002 |
| R-004 | Every result lists each fired rule ID, the finding and the value that triggered it | P0 | D-002 | T-006 |
| R-005 | Red-flag combinations (including chest pain with low SpO₂) produce Emergency and a visible alert | P0 | D-002 | T-003 |
| R-006 | Missing or unrecognised inputs show a "data incomplete" state and never render as plain Routine | P0 | D-003 | T-004 |
| R-007 | Live queue sorted by priority, then arrival time, updating within 3 s of a new or changed case without manual refresh | P0 | D-004 | T-007, T-008 |
| R-008 | Records persist locally and are viewable with no internet and after a restart | P0 | D-001 | T-009 |
| R-009 | A persistent "assists the clinician, does not replace them" notice, plus a recorded clinician-review action | P0 | D-005, D-010 | T-020 |
| R-010 | A trained operator can enter an unseen case end-to-end in at most 90 s (TARGET) | P0 | D-001, D-002 | T-017 |
| R-011 | Rules live in versioned configuration, and the rule-set version shows on every result | P1 | D-002, D-010 | T-019 |
| R-012 | Offline-created records queue in an outbox and sync idempotently; sync state is visible | P1 | D-006 | T-010 |
| R-013 | For Emergency cases: SOS panel with simulated hospital list, tel: links and a structured referral summary | P1 | D-007 | T-011 |
| R-014 | Each assessment is stored append-only with inputs, rule-set version, output, time and operator | P1 | D-005 | T-012 |
| R-015 | Operator can reassess with new vitals; the queue repositions and history is kept | P1 | D-004, D-005 | T-012 |
| R-016 | Voice input fills form fields behind a mandatory confirm step | P2 | D-009 | T-021 |
| R-017 | Chatbot in Hindi and English (Punjabi if time permits) with a deterministic red-flag pre-filter before the LLM | P2 | D-008 | T-013 |
| R-018 | Synthetic data only; no identifiers in logs or URLs; "synthetic data only" banner | P1 | D-001 | T-014 |
| R-019 | Hindi and English UI strings for the result card and queue | P2 | D-011 | T-022 |
| R-020 | One-command reset and seeding reproduce demo scenarios 1–4 identically | P0 | D-001 | T-015 |
| R-021 | Accessibility basics: colour is never the only cue, keyboard operable, large touch targets | P1 | D-011 | T-016 |
| R-022 | Age under 12 yields at least Urgent with a "paediatric thresholds not configured" banner | P1 | D-002 | T-018 |
