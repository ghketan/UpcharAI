# CTBF-AI-02 — Delivery, Tests, Risks and Definition of Done

**File 3 of 3.** IDs refer to files 1 and 2 and to `playbook-registry.yaml`.

---

## 1. Roles (placeholders; team unknown — Q-004)

| Role | Owns | Note |
|---|---|---|
| Lead / triage engine | Rule engine, rules config, test oracle (file 2 §2.4) | Also the clinical-reviewer liaison |
| Backend | FastAPI, SQLite, outbox and sync, seed and reset | |
| Frontend | Form, result card, queue, SOS, sync banner | Owns "must never imply" review |
| Demo / content | Hospital JSON, seed cases, rehearsal, fallback recording, chatbot copy | |

If the team is smaller than four, combine roles and flag it. Builders cannot independently approve their own clinical correctness (G-001), so one outside reviewer is needed, even informally.

## 2. 30-hour plan (relative hours; all TARGET until owners accept)

Estimates are TARGET timeboxes rather than person-hour estimates, because team capacity is unknown.

| M-ID | Window | Objective | Exit (proof) | Stop / replan trigger |
|---|---|---|---|---|
| M-001 | h0–6 | **Walking skeleton:** form → engine (rules TR-E01, TR-E10, TR-U05) → SQLite → queue on screen; repo and CI-free `make run` | T-001 subset, T-007 subset pass on 3 cases | Not done by h8 → drop React polish, use a basic form |
| M-002 | h6–14 | **P0 complete:** all rules, reasons, completeness state, implausible-value confirm, disclaimer, offline persistence, seeding and reset | T-001 to T-009, T-015, T-017 (first run), T-020 | P0 not done by h16 → freeze P1 work and cut per D-012 |
| M-003 | h14–22 | **Differentiators:** SOS and referral summary, audit and reassessment, rules config + version, outbox sync, paediatric floor, privacy checks | T-010 to T-012, T-014, T-018, T-019 | Sync target undecided (Q-002) by h14 → build outbox plus mock target; claim accordingly |
| M-004 | h22–26 | **Extras (only if M-003 is stable):** chatbot with pre-filter, localized strings, voice; **feature freeze at h26** | T-013, T-021, T-022, T-016 | Any P0/P1 regression → stop extras |
| M-005 | h26–30 | **Demo readiness:** judge-case drill, clinician review of thresholds, fallback recording, claim sheet, offline rehearsal | T-015 ×3, T-017 full, claim sheet matches C-001 to C-005 | Clinical review not obtained → ship "NOT clinically reviewed" labels |

Repository workflow: trunk with short feature branches, one engine owner, and every rule change must update the oracle table and its test in the same commit. Do not refactor after h22.

## 3. Test matrix

All tests are `PLANNED`, with no execution yet. Artefacts to retain for any later `MEASURED` label: path, commit, date, environment, method, owner.

| T-ID | Procedure and expected result | R |
|---|---|---|
| T-001 | Run the same input 100× → identical priority, findings and order | R-003 |
| T-002 | Boundary tests per rule (value −1, at, +1), e.g. SpO₂ 89 / 90 / 94 | R-003 |
| T-003 | Chest pain + SpO₂ 92 → Emergency (TR-E10); chest pain + SpO₂ 98 → Urgent, never Routine | R-005 |
| T-004 | Omit each vital in turn, and omit all → "INCOMPLETE" with the missing list; never plain Routine | R-006 |
| T-005 | SpO₂ 150, temp 400, SBP 0 → blocked until confirmed; confirmation is stored; the form maps all required fields | R-001, R-002 |
| T-006 | For every seeded case, the finding list is non-empty or says "no rule fired", and completeness is shown | R-004 |
| T-007 | 10 shuffled-arrival patients → expected sort; FIFO ties; PROVISIONAL Routine above complete Routine | R-007 |
| T-008 | Queue open; add an Emergency in a second tab → top row within 3 s, no manual refresh | R-007 |
| T-009 | Wi-Fi off; register, triage, view; restart server; records persist | R-008 |
| T-010 | 3 records created offline → connectivity on → target has exactly 3; repeat sync yields no duplicates; interrupted sync resumes | R-012 |
| T-011 | Emergency → SOS panel shows the simulated label; referral summary includes age, sex, vitals, findings and time; text scan finds no "dispatched"/"notified" claim | R-013 |
| T-012 | Re-measure vitals → new assessment appended, old kept, queue repositions, history ordered | R-014, R-015 |
| T-013 | Hindi and English red-flag phrases → fixed escalation without an LLM call; LLM unreachable → static text; injection attempt does not change behaviour | R-017 |
| T-014 | Scan logs, URLs and error payloads for patient fields → none | R-018 |
| T-015 | Reset and run scenarios 1–4 three times → identical outputs (hash of results) | R-020 |
| T-016 | Keyboard-only registration; contrast check; greyscale view still distinguishes priorities by text | R-021 |
| T-017 | **Judge-case drill:** a teammate not on the engine team writes 10 unseen cases (include odd symptoms). Record entry time (≤ 90 s target) and any false-Routine results | R-010, R-001 |
| T-018 | Age 8, normal vitals → at least Urgent plus the paediatric banner | R-022 |
| T-019 | Edit one threshold, restart → behaviour and the displayed version change | R-011 |
| T-020 | Disclaimer visible on result and queue; ACK action recorded with operator and time | R-009 |
| T-021 | Voice transcript fills fields but does not submit; recognition failure falls back to typing | R-016 |
| T-022 | Language toggle changes result card and queue labels; no missing-key strings | R-019 |

## 4. Risk register

| K-ID | Cause → event → consequence | Likelihood / impact | Earliest signal | Control and contingency | Owner |
|---|---|---|---|---|---|
| K-001 | Placeholder thresholds are wrong → misleading classes → judges or clinicians reject the tool | High / High | Reviewer disagrees on oracle cases | Clinician review (Q-003); lean toward over-triage; show "not clinically reviewed" | Lead |
| K-002 | Judge case has unseen symptoms or fields → no rule fires → false Routine | High / Critical | T-017 finds a false Routine | INCOMPLETE state for unrecognised free text; chest-pain always at least Urgent; ask organisers (Q-001); extensible symptom list | Lead |
| K-003 | Chatbot and voice built before the core is stable → P0 slips | Medium / High | M-002 not done by h16 | D-012 cut order; freeze at h26 | Lead |
| K-004 | Claiming offline while the architecture needs a server → false claim | Medium / High | T-009 fails | D-001; test with Wi-Fi really off | Backend |
| K-005 | Sync target undefined → demo shows fake sync | Medium / Medium | Q-002 unanswered at h14 | Label mock as mock; claim C-004 bounded | Backend |
| K-006 | LLM gives unsafe or incorrect advice | Medium / High | Test prompts misbehave | Pre-filter, fixed system prompt, no dosing, disclaimer; can be cut | Demo |
| K-007 | Laptop or Wi-Fi failure during the demo | Medium / High | Rehearsal glitches | Recorded fallback labelled as fallback; local-only stack | Demo |
| K-008 | Small team and key-person dependency | Medium / High | One person owns the engine alone | Pair on the engine; oracle table shared | Lead |
| K-009 | Over-triage floods the queue with Emergency → alert fatigue | Medium / Medium | Too many Emergency in T-017 | Review rules E04, E11 with the reviewer; Emergency reserved for flagged rules | Lead |
| K-010 | Judges enter real patient data | Low / High | — | Synthetic banner; reset deletes data; no network upload of records by default | Frontend |
| K-011 | Hindi or Punjabi medical wording is wrong | Medium / Medium | Native-speaker review disagrees | Keep strings short; native-speaker check; fall back to English | Demo |

## 5. Definition of done by checkpoint

### M-001 — Walking skeleton
- [ ] DoD-001 — End-to-end case reaches the queue with 3 rules. Links: R-003, R-007; T-001, T-007. Artefact: commit and screenshot.

### M-002 — P0 complete (**demo-minimum**)
- [ ] DoD-002 — All rule IDs in file 2 §2 implemented with boundary tests. Links: R-003, R-005; T-002, T-003.
- [ ] DoD-003 — Reasons, completeness and disclaimer appear on every result. Links: R-004, R-006, R-009; T-004, T-006, T-020.
- [ ] DoD-004 — Offline persistence works with Wi-Fi actually off. Links: R-008; T-009.
- [ ] DoD-005 — Reset and seeding are repeatable. Links: R-020; T-015.

### M-003 — Differentiators
- [ ] DoD-006 — SOS panel and referral summary are labelled simulated. Links: R-013; T-011.
- [ ] DoD-007 — Outbox sync works and is idempotent against the declared target. Links: R-012; T-010.
- [ ] DoD-008 — Audit and reassessment work. Links: R-014, R-015; T-012.

### M-005 — Demo ready
- [ ] DoD-009 — Judge-case drill complete; false-Routine cases resolved or documented. Links: R-010; T-017.
- [ ] DoD-010 — Claim sheet matches the evidence in C-001 to C-005; clinical review status stated. Links: R-009, R-011.

Checkpoint state for all: `NOT VERIFIED`.

## 6. Judge Q&A (bounded answers)

| Question | Answer | Do not say |
|---|---|---|
| Is this AI? | The triage is a rule engine (deterministic and explainable). An LLM is used only for the optional multilingual information chatbot. | "AI diagnoses patients" |
| Is it clinically validated? | No. Thresholds are placeholders pending clinician review. The tool prioritises and assists; the doctor decides. | "Validated", "accurate" |
| Does the SOS call an ambulance? | No. It shows a simulated directory and prepares a referral summary. | "Dispatches", "notifies" |
| What if data is missing? | It is flagged as incomplete and shown as provisional, never as safe. | "Routine means safe" |
| Does it work offline? | Core registration, triage, queue and records run locally. Chatbot and live lookups need internet. | "Fully offline" |
| What is novel? | The combination of explained triage, queue and referral in one offline-capable workflow. No claim of a first. | "First of its kind" |

## 7. Open gaps (carried forward)

| G-ID | Gap | Severity | Next action |
|---|---|---|---|
| G-001 | Thresholds are not clinically reviewed | Critical | Find a reviewer (Q-003); record `clinical_review` in the rules file |
| G-002 | No primary clinical or national-guideline sources retrieved | High | Search for official triage and vital-sign guidance, then log each as S-### and re-label rules |
| G-003 | Sync target undefined | Medium | Resolve Q-002 by h14 |
| G-004 | Team composition unknown | Medium | Resolve Q-004 at the start |
| G-005 | Hospital directory not yet compiled | Low | Demo role; use a clearly fictional or sourced list, labelled |
| G-006 | No independent reviewer; all audits are self-review | Medium | Run Part V of the builder in a fresh context if wanted |

## 8. Immediate next actions (first hour)

1. Ask the organisers Q-001 and Q-002.
2. Fix D-001 and create the repository: `engine/`, `api/`, `ui/`, `rules/rules.v1.yaml`, `seed/`.
3. Write the oracle table from file 2 §2.4 as tests before writing the engine.
4. Find the clinical reviewer (Q-003).
5. Build the walking skeleton (M-001).

## 9. Author audit

See the mechanical results appended to this file after the registry check.

### Self-review audit results (author, not independent)

Method: script over `playbook-registry.yaml` plus a regex scan of files 1–3, run at build time. A PASS means the check ran; it does not mean the design is correct.

| Check | Result |
|---|---|
| Every P0/P1 R has at least one D and one T | PASS |
| Every T maps to an R | PASS |
| No D, T or R referenced in prose is undefined | PASS |
| Every consequential clinical number labelled ASSUMED | PASS (file 2 banner, G-001) |
| Every screen has must-show and must-never-imply | PASS (file 2 §5) |
| K/Q/G owner or resolution path | PASS (by inspection, not scripted) |
| Registry coverage of K, Q, G, C, S, M, X records | **NOT RUN**: registry holds R, D, T only; the rest live in the Markdown tables |
| Independent review | **NOT RUN** (G-006) |
