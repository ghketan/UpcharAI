/**
 * UpcharAI Oracle Verification Runner
 * Verifies VM-01, VM-02, VM-03 against the 12 canonical cases in 02-triage-rule-spec.md §7
 */

import { evaluateTriage } from "./engine.js";
import { ORACLE_TEST_CASES } from "./data.js";

export function runOracleVerification() {
  const results = [];
  let passedCount = 0;
  let failedCount = 0;
  const startTime = performance.now();

  for (const tc of ORACLE_TEST_CASES) {
    const outcome = evaluateTriage(tc.input);

    const priorityPass = outcome.priority === tc.expectedPriority;
    const news2Pass = outcome.news2.total === tc.expectedNews2;

    const actualRuleIds = outcome.findings.map(f => f.rule_id);
    const rulesPass = tc.expectedRules.every(r => actualRuleIds.includes(r));

    const actualFlagIds = outcome.flags.map(f => f.id);
    const flagsPass = tc.expectedFlags.every(fl => actualFlagIds.includes(fl));

    const isSuccess = priorityPass && news2Pass && rulesPass && flagsPass;

    if (isSuccess) passedCount++;
    else failedCount++;

    results.push({
      id: tc.id,
      description: tc.description,
      input: tc.input,
      expected: {
        priority: tc.expectedPriority,
        news2: tc.expectedNews2,
        rules: tc.expectedRules,
        flags: tc.expectedFlags
      },
      actual: {
        priority: outcome.priority,
        news2: outcome.news2.total,
        rules: actualRuleIds,
        flags: actualFlagIds
      },
      findings: outcome.findings,
      checks: {
        priorityPass,
        news2Pass,
        rulesPass,
        flagsPass
      },
      pass: isSuccess
    });
  }

  const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    total: ORACLE_TEST_CASES.length,
    passed: passedCount,
    failed: failedCount,
    durationMs,
    allPassed: failedCount === 0,
    results
  };
}
