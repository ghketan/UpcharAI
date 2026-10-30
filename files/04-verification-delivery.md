# 04 — Verification, Delivery, Risks and Review

| Field | Value |
|---|---|
| Revision | REV-001 |
| Purpose | Define observable verification, the session map, risks, permitted claims and the review plan |
| Canonical IDs | RISK-001–RISK-012, SESSION-001–SESSION-008, VM-01–VM-25 (row labels, not canonical IDs), C-001–C-005 (claim labels) |
| Dependencies | 00, 01, 02, 03 |
| Repository baseline | NOT INSPECTED |
| Unresolved items | RISK-001, RISK-003, RISK-006, RISK-007, RISK-012 |
| Supersedes | none |

## 1. Verification matrix

All rows have status `PLANNED` (nothing has been run). `VM-nn` are row labels used by the registry.

| Row | Covers | Behaviour or failure | Layer | Expected evidence |
|---|---|---|---|---|
| VM-01 | REQ-003, REQ-005, REQ-012, DEC-002 | All 12 oracle cases in 02 §7 give the expected priority and rule set; the same input 100 times gives identical output | Pure logic | Test output with case IDs |
| VM-02 | REQ-004 | Boundary test (value −1, at, +1) for every band in 02 §2; a reviewer cross-checks the table against the primary RCP chart and records the result | Pure logic + manual | Test output + signed cross-check note |
| VM-03 | REQ-006 | Omit each required vital in turn and all together: INCOMPLETE with the missing list, never plain Routine; free text gives NEEDS_REVIEW; missing rr/avpu gives UNDERSTATED | Pure logic + UI | Test output + screenshots |
| VM-04 | REQ-001, REQ-002 | Form carries every field in 02 §1; SpO₂ 150, temp 400, SBP 0, DBP ≥ SBP are blocked until confirmed; the confirmation is stored | Contract + UI | API test + screenshot |
| VM-05 | REQ-007 | Ten shuffled patients sort per 02 §5; adding an Emergency in a second tab reaches the top within 3 s with no manual refresh; STALE appears when the API is stopped | Integration + end to end | Test output + screen recording |
| VM-06 | REQ-008 | Wi-Fi really off: register, assess, view, restart the server, records persist | End to end | Screen recording with network status visible |
| VM-07 | REQ-009 | Nurse cannot finalise or lower priority (403); doctor finalises up and down with a reason; downgrade without reason refused; new assessment returns the case to PRELIMINARY; the persistent disclaimer is visible on result and queue | Contract + UI | API tests + screenshots |
| VM-08 | REQ-010 | **Unseen-case drill:** a person who did not build the engine writes 10 unseen cases (include children, pregnancy, odd text); record entry time (target ≤ 90 s each) and any false Routine | Manual | Drill sheet |
| VM-09 | REQ-011 | Reset then scenarios 1–4, three times: identical output hashes | End to end | Hash log |
| VM-10 | REQ-013 | Edit one threshold and restart: behaviour and displayed `rule_set_version` change; clinical-review status shows "Not clinically reviewed" while NONE | Integration | Test output |
| VM-11 | REQ-014 | Reassessing appends a new row, keeps old rows, repositions the queue by `arrived_at` rule; no update/delete endpoint exists | Contract | API test + schema check |
| VM-12 | REQ-015 | Three records created offline arrive exactly once after reconnection; repeating sync adds none; interruption resumes; `parent_missing` retried; FAILED visible | Integration | Test output on two instances |
| VM-13 | REQ-016, REQ-017 | Emergency shows the SOS panel labelled SIMULATED; referral summary has every field in 03 §7; text scan finds no "dispatched" or "notified" | Integration + text scan | Test output |
| VM-14 | REQ-018 | Keyboard-only registration; contrast check; greyscale screenshot still distinguishes priorities by text | Accessibility | Checklist + screenshots |
| VM-15 | REQ-019, SEC-001, SEC-002 | Synthetic banner present; scan logs, URLs and error bodies for patient fields: none | Security-negative | Scan output |
| VM-16 | REQ-020 | Three people outside the team read three result cards and say what to do; record whether they get it right (TARGET: all three) | Manual | Observation sheet |
| VM-17 | REQ-021, RISK-006 | Voice fills free text without submitting; unsupported and offline cases hide or disable it; label shows "online service" | UI | Screenshots |
| VM-18 | REQ-022, SEC-003 | Red-flag phrases in English and Hindi return fixed text without an LLM call; LLM unreachable gives static text; injection attempts and dose requests are refused; no record data in the request | Integration + security-negative | Test output |
| VM-19 | REQ-023 | Language toggle changes result card and queue labels; no missing-key strings; native-speaker check recorded | UI + manual | Screenshots + note |
| VM-20 | REQ-025, SEC-006 | Forbidden-string scan passes on UI, docs and slides; claim sheet matches 04 §5 | Text scan | Scan output |
| VM-21 | SEC-004 | Role table enforced server-side for each endpoint | Contract | API tests |
| VM-22 | SEC-005 | Secret scan finds no key in the repository | Security-negative | Scan output |
| VM-23 | SEC-007 | Ingest returns 404 when `TARGET_MODE` is off; target instance refuses create endpoints | Contract | API tests |
| VM-24 | REQ-024 | Punjabi is DEFERRED; if built, repeat VM-19 | — | Not required |
| VM-25 | RISK-001 | A person with relevant clinical training reviews 02 §3 and §7; the reviewer name, qualification and date are recorded in `rules.v1.yaml` | Manual | Signed review note |

## 2. Provisional session map

One contract at a time; each is compiled after the previous receipt is reconciled. This map is provisional and the first real session is a pilot of the contract format.

| Session | Outcome | Included IDs | Depends on |
|---|---|---|---|
| SESSION-001 | Pure rule engine, config loader, oracle tests | REQ-003, 004, 005, 006, 012, 013 | none |
| SESSION-002 | API and SQLite: patients, assessments, validation, persistence, reset and seed, audit tables | REQ-001, 002, 008, 011, 014, SEC-002, SEC-004 | 001 |
| SESSION-003 | UI core: form, result card, live queue, roles, finalise, escalate | REQ-007, 009, 010, 018, 020 | 002 |
| SESSION-004 | Reassessment, SOS panel, referral summary, hospitals file | REQ-016, 017 | 003 |
| SESSION-005 | Sync outbox, target mode, sync banner | REQ-015, SEC-007 | 002 |
| SESSION-006 | Hardening: privacy and string scans, accessibility checks, unseen-case drill, claim sheet | REQ-019, 025, SEC-001, 005, 006 | 003–005 |
| SESSION-007 | Chatbot and Hindi/English strings (only if SESSION-006 is stable) | REQ-022, 023, SEC-003 | 006 |
| SESSION-008 | Voice free-text input (only if time remains) | REQ-021 | 007 |

**Timebox (TARGET, owners must accept):** the whole build fits a 30-hour window with a feature freeze after SESSION-006 plus a first run of VM-08; the last hours are for VM-08, VM-25, the fallback recording and rehearsal. If P0 is not done by about hour 16, apply DEC-012.

## 3. Risk register

| RISK-ID | Cause → event → consequence | Likelihood / impact | Earliest signal | Control and contingency | Owner |
|---|---|---|---|---|---|
| RISK-001 | Red-flag thresholds and the NEWS2-to-three-level mapping are unreviewed → misleading classes → loss of credibility or harm in phase 2 | High / High | VM-25 not done | Find a clinical reviewer (even informal); keep "Not clinically reviewed"; lean to over-triage | Lead |
| RISK-002 | A judge case is outside NEWS2 scope (child, pregnancy, special) or has unseen text → Routine by accident | High / Critical | VM-08 finds a false Routine | Floors and NEEDS_REVIEW flag (DEC-006); more rules only with clinician input | Lead |
| RISK-003 | Sync target is only a mock → misleading claim | Medium / Medium | Target not built by SESSION-005 | Label MOCK everywhere; claim C-004 as "queued" | Backend |
| RISK-004 | Chatbot and voice built before the core is stable → P0 slips | Medium / High | SESSION-003 late | DEC-012; freeze after SESSION-006 | Lead |
| RISK-005 | Demo device or Wi-Fi failure → no live demo | Medium / High | Rehearsal glitches | Local-only stack; recorded fallback labelled as fallback | Demo |
| RISK-006 | Voice sends audio to a cloud service; Hindi on-device unsupported → privacy and offline claim wrong | High / Medium | VM-17 | Free-text only, hidden when unsupported, label shown | Frontend |
| RISK-007 | LLM provider, terms and safety are unverified → unsafe answers or no key | Medium / High | Start of SESSION-007 | Verify current docs then; pre-filter, output check, static fallback; can be cut | Demo |
| RISK-008 | Aggregate and single-parameter triggers over-escalate → too many Emergency or Urgent → alert fatigue | Medium / Medium | VM-08 results | Review with the clinician; thresholds live in config | Lead |
| RISK-009 | Partial NEWS2 understated because rr/avpu are not entered → reassuring Routine | High / High | Judge cases lack rr | UNDERSTATED flag always shown; footer on Routine | Frontend |
| RISK-010 | Role selector is spoofable → unauthorised finalise | High / Low (demo) | — | UI-008 labels it; server enforces anyway; phase 2 real auth | Backend |
| RISK-011 | Hindi medical wording wrong | Medium / Medium | Native-speaker check differs | Short strings, native check, English fallback | Demo |
| RISK-012 | The review is a same-provider critic with user-attested provenance → weaker assurance than independent review | Medium / Medium | — | State it; add a clinician check; do not call it independent | Architect |

## 4. Evidence register and Platform Hazard Register

| Label | Claim | Source | Accessed | Evidence state | Decision supported |
|---|---|---|---|---|---|
| EV-1 | NEWS2 band scores for SpO₂ (scale 1), SBP, pulse, temp; aggregate triggers 5 and 7; excludes obstetric patients | NHS/RCP-derived guidance and charts | 2026-10-30 | VERIFIED (bands, triggers); secondary for rr/avpu/oxygen | DEC-002, DEC-006, 02 §2 |
| EV-2 | Browser speech recognition is server-based by default; `processLocally` is experimental; Edge on-device language list lacks Hindi | MDN Web Speech API; Microsoft Edge documentation | 2026-10-30 | VERIFIED | DEC-009, 03 §9 |
| EV-3 | India-specific triage guidance and the regulatory status of decision-support software | not researched | — | UNVERIFIED | Phase 2 gate only |

| RISK | Platform / version | Verified behaviour | Source / accessed | Mitigation | Verification |
|---|---|---|---|---|---|
| RISK-006 | Browser Web Speech API; Edge local model (Edge 150) | Cloud by default; on-device experimental; Hindi not listed | EV-2 / 2026-10-30 | See 03 §9 | VM-17 |

## 5. Permitted claims

| C-ID | Permitted claim | Status | Cannot prove |
|---|---|---|---|
| C-001 | "With rule set v1, the app gives a **preliminary** priority and the rules behind it, deterministically." | TARGET | That the rules are clinically correct |
| C-002 | "Registration, triage, queue and record viewing run with the internet off on the demo device." | TARGET | Behaviour on other devices |
| C-003 | "A doctor finalises every result; the tool only prioritises." | TARGET | That a doctor reviewed the tool's rules |
| C-004 | "Records are queued and synced to a named demo target (or a mock) when connectivity returns." | TARGET (RISK-003) | Cloud sync, or multi-device conflict handling |
| C-005 | "SOS shows a simulated hospital list and a prepared referral summary." | TARGET | Any dispatch or notification |

No claim moves from TARGET to MEASURED until the artefact path, build or commit, date, environment, method and owner exist.

## 6. Review plan (STANDARD)

| Field | Value |
|---|---|
| Review ID | REVIEW-001 (PLANNED) |
| Mode | FRESH_CONTEXT_CRITIC, same provider (not provider-independent) |
| Provenance | USER-ATTESTED, expected |
| Data handling | Packet contains no personal data and no credentials. Destination (a new conversation on the same provider) must be confirmed by the user before the packet is issued |
| Added check | A qualified clinical review of 02 §3 and §7 (VM-25) is recommended and is a separate evidence item, not a substitute |
| Limitations | A model's PASS does not establish clinical correctness; RISK-012 |

## 7. Final verification and acceptance

Final verification builds the Requirement Completion Matrix from the registry against the real repository. If the repository cannot be inspected, acceptance cannot rely on receipts alone. User acceptance names the verified revision and lists residual risks (RISK-001, RISK-003, RISK-006, RISK-009 at minimum) and anything deferred (REQ-024).
