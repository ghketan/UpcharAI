from typing import Optional
from engine.config import RuleConfig, load_config
from engine.models import (
    AssessmentInputs,
    Finding,
    Priority,
    TriageResult,
)
from engine.news2 import calculate_news2
from engine.plausibility import PlausibilityError, check_plausibility
from engine.rules import evaluate_rules

SUGGESTED_ACTIONS = {
    Priority.EMERGENCY: "Alert the doctor now.",
    Priority.URGENT: "Doctor should see this patient soon, before routine cases.",
    Priority.ROUTINE: "No urgent signs found by this tool. A clinician still reviews every case.",
}

TIER_ORDER = {
    Priority.EMERGENCY: 1,
    Priority.URGENT: 2,
    Priority.ROUTINE: 3,
}


def evaluate_triage(
    inputs: AssessmentInputs,
    config: Optional[RuleConfig] = None,
) -> TriageResult:
    """
    Pure evaluation of patient triage based on rules.v1.yaml.
    Deterministic and side-effect free.
    """
    cfg = config or load_config()

    # Check plausibility bounds unless explicit confirmation is provided
    if not inputs.confirm_implausible:
        violations = check_plausibility(inputs, cfg)
        if violations:
            raise PlausibilityError(violations)

    # 1. Compute NEWS2 score
    news2 = calculate_news2(inputs, cfg)

    # 2. Evaluate all rules without short-circuiting
    findings, flags, missing_critical = evaluate_rules(inputs, news2, cfg)

    # 3. Sort findings deterministically: tier rank ascending (EMERGENCY=1, URGENT=2), then rule_id
    findings.sort(key=lambda f: (TIER_ORDER.get(f.tier, 99), f.rule_id))

    # 4. Priority derivation: highest tier among fired rules
    has_emergency = any(f.tier == Priority.EMERGENCY for f in findings)
    has_urgent = any(f.tier == Priority.URGENT for f in findings)

    if has_emergency:
        priority = Priority.EMERGENCY
    elif has_urgent:
        priority = Priority.URGENT
    else:
        priority = Priority.ROUTINE

    # 5. Suggested action
    suggested_action = SUGGESTED_ACTIONS[priority]

    return TriageResult(
        priority=priority,
        flags=flags,
        missing=missing_critical,
        news2=news2,
        findings=findings,
        suggested_action=suggested_action,
        rule_set_version=cfg.rule_set_version,
        clinical_review_status=cfg.clinical_review_status,
    )
