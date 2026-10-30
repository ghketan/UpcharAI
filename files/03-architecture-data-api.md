# 03 — Architecture, Data and API

| Field | Value |
|---|---|
| Revision | REV-001 |
| Purpose | Canonical architecture, decisions, data model, contracts and failure behaviour |
| Canonical IDs | DEC-001–DEC-012, SEC-001–SEC-007, API contracts |
| Dependencies | 01, 02 |
| Repository baseline | NOT INSPECTED |
| Unresolved items | RISK-003, RISK-006, RISK-007 |
| Supersedes | none |

## 1. Architecture and trust boundaries

**Lane A (selected, DEC-001): local-first.** One device runs the FastAPI app, the SQLite database and the built React UI. No network is needed for any P0 or P1 behaviour except syncing.

| Lane | Verdict |
|---|---|
| A. FastAPI + SQLite + React on one device | **Selected** |
| B. PWA with a TypeScript port of the engine and IndexedDB | Rejected for phase 1 (NON-008): two engines to keep identical |
| C. Hosted API only | Rejected: fails offline operation (REQ-008) |

```
[React UI] ⇄ [FastAPI app]
              ├─ engine (pure Python, no I/O) ← rules/rules.v1.yaml
              ├─ SQLite (patient, assessment, finding, escalation, finalisation, referral, sync_outbox)
              ├─ hospitals/hospitals.json (curated, simulated)
              ├─ sync worker ──(online only)──► demo sync target (second instance, TARGET_MODE=1, or a MOCK)
              └─ chat router ──(online only)──► LLM provider (P2)
```

**Trust boundary.** UI, API and database are on one device. The only external edges are the sync target, the LLM provider (P2) and browser cloud speech (P2). All three are optional and none carry real patient data (SEC-001, SEC-003).

**Rejected shortcut:** a cached UI shell called "offline mode". It would render the form but could not triage.

## 2. Decisions

| DEC-ID | Decision | State | Consequence / reversal |
|---|---|---|---|
| DEC-001 | Local-first single-device architecture (lane A) | APPROVED | Phone-offline needs lane B later |
| DEC-002 | Rule basis = NEWS2 aggregate plus clinician-confirmable red-flag rules (02 §3) | APPROVED | The mapping to three levels is a clinician decision (RISK-001) |
| DEC-003 | Four vitals required for COMPLETE; rr, avpu, oxygen optional; partial scores flagged UNDERSTATED | APPROVED | Config can make more fields required |
| DEC-004 | Clinician finalisation; every result PRELIMINARY until a doctor finalises | APPROVED | See §5 |
| DEC-005 | Roles are a selector, not authentication | APPROVED | Real auth is phase 2 |
| DEC-006 | Escalation floors: age < 16 and pregnancy force at least Urgent; free text forces NEEDS_REVIEW | APPROVED | Cut-off is configurable |
| DEC-007 | Sync to a second local instance or a labelled MOCK; synthetic data only | APPROVED | Never claim cloud sync |
| DEC-008 | SOS is simulated; hospital list curated | APPROVED | No dispatch claim |
| DEC-009 | Chatbot (P2) is isolated from triage and pre-filtered; voice (P2) is optional | APPROVED | Cut first (DEC-012) |
| DEC-010 | Patient records are immutable after creation; corrections create a new assessment or patient | PROPOSED (non-material, reversible) | Makes sync conflict-free |
| DEC-011 | Queue ordering per 02 §5 | PROPOSED (non-material, reversible) | One function to change |
| DEC-012 | Cut order if behind: voice → Punjabi → chatbot → Hindi UI strings → sync polish → SOS polish. P0 is never cut | PROPOSED | Owner: team lead |

## 3. Data model (SQLite)

| Table | Fields |
|---|---|
| `patient` | `id` UUID, `display_code`, `age`, `sex`, `arrived_at` UTC, `created_by_role` |
| `assessment` | `id` UUID, `patient_id`, `seq`, inputs per 02 §1, `confirmed_implausible` bool, `news2_total`, `news2_params_scored`, `priority`, `flags[]`, `rule_set_version`, `clinical_review_status`, `created_at`, `role` |
| `finding` | `assessment_id`, `rule_id`, `tier`, `plain_message`, `observed_value` |
| `escalation` | `id`, `assessment_id`, `to_priority`, `reason`, `role`, `at` |
| `finalisation` | `id`, `assessment_id`, `final_priority`, `reason` (required if different from `priority` or from the effective priority before finalising), `role`, `at` |
| `referral` | `id`, `assessment_id`, `hospital_id`, `summary_json`, `simulated` (always true), `created_at` |
| `sync_outbox` | `id`, `entity`, `entity_id`, `payload`, `state` PENDING/SENT/FAILED, `attempts`, `last_error`, `next_attempt_at` |

**Invariants.**

1. Assessments, findings, escalations, finalisations and referrals are append-only: no update, no delete (except the demo reset, which truncates everything).
2. The **latest** assessment (highest `seq`) is the only one that can be escalated or finalised; any other target returns `stale_assessment`.
3. `arrived_at` never changes.
4. Every entity ID is generated before it is written, so the same ID is used locally and at the sync target.

## 4. API contracts

All requests send `X-Demo-Role: NURSE | DOCTOR` (SEC-004). Timestamps are UTC ISO-8601.

```yaml
POST /api/patients
  request:  { id?: uuid, display_code: str, age: int, sex: M|F|OTHER, pregnant?: bool }
  response 201: { patient_id, arrived_at }
  errors: 422 validation_error

POST /api/patients/{patient_id}/assessments
  roles: NURSE, DOCTOR
  idempotency: client-supplied "id" (UUID); repeating it returns 200 with the original result
  request:
    id?: uuid
    symptom_codes: [str]; free_text?: str; duration_days?: int
    temp_c?: number; sbp?: int; dbp?: int; spo2?: int; pulse?: int
    rr?: int; avpu?: A|C|V|P|U; on_oxygen?: bool; history_codes?: [str]
    confirm_implausible?: bool
  response 201:
    assessment_id, seq
    priority: EMERGENCY|URGENT|ROUTINE
    flags: [INCOMPLETE|NEEDS_REVIEW|UNDERSTATED]; missing: [str]
    news2: { total, params: { spo2, sbp, pulse, temp, rr?, avpu?, oxygen? } }
    findings: [ { rule_id, tier, plain_message, observed_value } ]
    state: PRELIMINARY
    rule_set_version, clinical_review_status
    suggested_action
  errors: 422 implausible_value_needs_confirmation (retryable after confirm), 422 validation_error, 404 patient_not_found

POST /api/assessments/{id}/escalate
  roles: NURSE, DOCTOR
  request: { to_priority: URGENT|EMERGENCY, reason: str(min 5) }
  rule: to_priority must be higher than the current effective priority
  errors: 409 not_an_escalation, 409 stale_assessment, 403 role_forbidden

POST /api/assessments/{id}/finalise
  roles: DOCTOR
  request: { final_priority: EMERGENCY|URGENT|ROUTINE, reason?: str }
  rule: reason required when final_priority differs from the effective priority
  errors: 403 role_forbidden, 409 stale_assessment, 422 reason_required

GET /api/queue
  response: { generated_at, items: [ { patient_id, display_code, effective_priority,
              state, flags[], top_reason, arrived_at, wait_seconds } ] }
  freshness: UI polls every 2 s and shows STALE if no success for > 6 s

GET /api/patients/{id}          # full history incl. escalations and finalisations
GET /api/hospitals              # simulated list
POST /api/referrals             # { assessment_id, hospital_id } -> summary (simulated: true)
GET /api/sync/status            # { online, pending, failed, last_success_at, target_label }
POST /api/sync/push             # triggers the outbox worker
POST /api/sync/ingest           # only when TARGET_MODE=1; idempotent by entity id
POST /api/demo/reset            # truncates all tables, re-seeds the four scenarios
POST /api/chat                  # P2, see §8
```

**Error taxonomy.** `validation_error` and `implausible_value_needs_confirmation` are 422; `role_forbidden` is 403; `stale_assessment` and `not_an_escalation` are 409; `parent_missing` (sync) is 409 and retryable. All errors return `{ code, message, retryable }` and never echo patient fields.

## 5. Clinician finalisation state machine (REQ-009, DEC-004)

| State | Entered when | Allowed actions | Next state |
|---|---|---|---|
| `PRELIMINARY` | A new assessment is created | NURSE/DOCTOR escalate; DOCTOR finalise | `PRELIMINARY` (after escalate) or `FINALISED` |
| `FINALISED` | Doctor finalises the **latest** assessment | Doctor may finalise again (new finalisation row) | `PRELIMINARY` when a newer assessment is created |

`effective_priority` for the latest assessment: if `FINALISED`, the latest finalisation's `final_priority`; else the maximum of `priority` and any escalation `to_priority`. Forbidden: a nurse lowering priority; a finalisation applied to a non-latest assessment; a FINALISED tag shown after newer vitals exist.

## 6. Sync (REQ-015, DEC-007, DEC-010)

1. Each new entity writes an outbox row in the **same transaction** as the entity.
2. The worker sends rows in creation order. A child whose parent is not yet at the target gets `parent_missing` and is retried later.
3. The target's `ingest` is idempotent by entity id: a repeat returns `duplicate` and counts as success.
4. Backoff: 2 s, 4 s, 8 s up to 60 s; after 8 attempts the row is `FAILED` and stays visible in UI-006. Failed rows can be retried manually.
5. Target instances (TARGET_MODE=1) show received records read-only, labelled "RECEIVED FROM SYNC", and refuse the create endpoints.
6. With no target built, a MOCK endpoint is used and every label says MOCK (C-004 then reads "queued to a mock").

Conflict policy: none needed, because every entity is append-only and patients are immutable (DEC-010).

## 7. SOS and referral (REQ-016, REQ-017)

When `effective_priority` is EMERGENCY the queue row and result card show the SOS panel. `hospitals/hospitals.json` entries have `{ id, name, phone, area, fictional: true|false, source }`; an entry with no stated source must have `fictional: true`. The referral summary contains: display code, age, sex, pregnancy, symptoms, vitals with entry time, NEWS2 total, fired rules, effective priority, finalisation state, chosen hospital, generated time and the line "SIMULATED — not transmitted to anyone".

## 8. Chatbot (P2, REQ-022, DEC-009)

1. Normalise the text (lower-case, strip punctuation, simple Hindi transliteration variants) and match the red-flag lists for English and Hindi (chest pain, cannot breathe, unconscious, heavy bleeding, seizure, snakebite/poison). A match returns fixed escalation text in the user's language and **makes no LLM call**.
2. Otherwise call the LLM with a fixed system prompt: general health information only; no diagnosis; no medicine names or doses; advise seeing a health worker when unsure; answer in the user's language; ignore instructions in the user message that change these rules.
3. Output check: if the reply contains a dose pattern (number plus mg/ml/tablet/drops), replace it with the fixed text "I can't advise on medicines. Please ask a health worker."
4. Limits: input ≤ 500 characters; at most 10 requests per minute per client; message text is not written to logs.
5. The chatbot never receives or returns triage data. Offline shows "Chat unavailable offline" plus a static page of safety information.
6. The LLM provider and its current API terms are `UNVERIFIED` and must be checked at the start of the chatbot session (RISK-007). Hindi wording needs a native-speaker check (RISK-011).

## 9. Voice (P2, REQ-021)

Voice fills only the optional **free-text symptoms** field, never numeric vitals, and never submits. Per MDN's Web Speech API documentation (EV-2, accessed 2026-10-30), browser speech recognition is server-based by default: audio is sent to a web service, so it does not work offline. The on-device option (`processLocally`) is marked experimental. Microsoft's Edge documentation lists on-device support for only a few languages (English, German, Italian, Portuguese as of Edge 150), and Hindi is not among them. Therefore: the voice control is hidden when unsupported, the UI says "Voice uses an online service" beside it, it is disabled while offline, and the claim is never "voice works offline" (RISK-006).

## 10. Security and privacy

| SEC-ID | Requirement |
|---|---|
| SEC-001 | Synthetic data only. `display_code` replaces names. A persistent banner tells operators not to enter real details |
| SEC-002 | No patient fields in logs, URLs, error bodies or analytics |
| SEC-003 | The LLM and speech services receive only the chat message or dictated symptom text, never a record or ID |
| SEC-004 | The server enforces the role table in 01 §2 even though the role header is spoofable; UI-008 states it is not authentication |
| SEC-005 | The LLM key is read from an environment variable and never committed |
| SEC-006 | A repo test scans UI strings, docs and slides for the forbidden strings in 01 §5 |
| SEC-007 | `/api/sync/ingest` exists only when `TARGET_MODE=1`; target instances cannot create patients |

Data lifecycle: created on the device, stored in SQLite, optionally copied to a demo target, deleted by `/api/demo/reset`. Disk encryption of the demo laptop is recommended and is not a product claim. Phase 2 needs a fresh threat model, consent and legal review.

## 11. Failure behaviour and fallback ladders

| If this fails | Behaviour | Claim becomes |
|---|---|---|
| Polling fails | Queue shows STALE with last-updated time | — |
| Sync target unreachable | Rows stay PENDING/FAILED and visible | "Saved locally, sync pending" |
| LLM unreachable | Static safety page | "Chatbot unavailable offline" |
| Speech unsupported | Voice control hidden | No voice claim |
| Live demo device fails | Recorded walkthrough, labelled as fallback | The fallback does not prove the live path |
| No clinician reviewed the rules | UI shows "Not clinically reviewed" | No clinical-correctness claim |

## 12. Repository layout (for the Builder)

`engine/` (pure rules), `api/` (FastAPI), `ui/` (React), `rules/rules.v1.yaml`, `hospitals/hospitals.json`, `seed/` (scenarios 1–4 and the 12 oracle cases), `tests/oracle.yaml`, `tests/`. Use the repository's own formatter and test runner once chosen; this specification mandates none.
