from pathlib import Path
from typing import Any, Dict, List, Optional
import yaml


class RuleConfig:
    def __init__(self, raw: Dict[str, Any]):
        self.raw = raw
        self.rule_set_version: str = raw.get("rule_set_version", "v1")
        self.clinical_review: Dict[str, Any] = raw.get("clinical_review", {"status": "NONE", "reviewer": None, "date": None})
        self.clinical_review_status: str = self.clinical_review.get("status", "NONE")
        self.age_floor: int = raw.get("age_floor", 16)
        self.plausibility: Dict[str, Any] = raw.get("plausibility", {})
        self.news2: Dict[str, Any] = raw.get("news2", {})
        self.symptom_codes: List[str] = raw.get("symptom_codes", [])
        self.history_codes: List[str] = raw.get("history_codes", [])


_DEFAULT_CONFIG_PATH = Path(__file__).resolve().parent.parent / "rules" / "rules.v1.yaml"
_CACHED_CONFIG: Optional[RuleConfig] = None


def load_config(path: Optional[Path] = None, force_reload: bool = False) -> RuleConfig:
    global _CACHED_CONFIG
    if _CACHED_CONFIG is not None and not force_reload and path is None:
        return _CACHED_CONFIG

    target_path = path or _DEFAULT_CONFIG_PATH
    if not target_path.exists():
        raise FileNotFoundError(f"Rule configuration file not found at {target_path}")

    with open(target_path, "r", encoding="utf-8") as f:
        raw = yaml.safe_load(f)

    config = RuleConfig(raw)
    if path is None:
        _CACHED_CONFIG = config
    return config

