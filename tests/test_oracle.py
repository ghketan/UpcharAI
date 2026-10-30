"""
Oracle verification test suite for UpcharAI
CTBF-AI-02 · 02-triage-rule-spec.md §7
Verifies VM-01, VM-02, VM-03
"""

import unittest
import json
import os

def calculate_news2(spo2=None, sbp=None, pulse=None, temp_c=None, rr=None, avpu=None, on_oxygen=None):
    total = 0
    scores = {}

    if spo2 is not None:
        if spo2 <= 91: s = 3
        elif spo2 <= 93: s = 2
        elif spo2 <= 95: s = 1
        else: s = 0
        scores['spo2'] = s
        total += s

    if sbp is not None:
        if sbp <= 90: s = 3
        elif sbp <= 100: s = 2
        elif sbp <= 110: s = 1
        elif sbp <= 219: s = 0
        else: s = 3
        scores['sbp'] = s
        total += s

    if pulse is not None:
        if pulse <= 40: s = 3
        elif pulse <= 50: s = 1
        elif pulse <= 90: s = 0
        elif pulse <= 110: s = 1
        elif pulse <= 130: s = 2
        else: s = 3
        scores['pulse'] = s
        total += s

    if temp_c is not None:
        if temp_c <= 35.0: s = 3
        elif temp_c <= 36.0: s = 1
        elif temp_c <= 38.0: s = 0
        elif temp_c <= 39.0: s = 1
        else: s = 2
        scores['temp_c'] = s
        total += s

    if rr is not None:
        if rr <= 8: s = 3
        elif rr <= 11: s = 1
        elif rr <= 20: s = 0
        elif rr <= 24: s = 2
        else: s = 3
        scores['rr'] = s
        total += s

    if avpu is not None:
        avpu = str(avpu).upper()
        s = 0 if avpu == 'A' else 3
        scores['avpu'] = s
        total += s

    if on_oxygen is not None:
        s = 2 if on_oxygen else 0
        scores['on_oxygen'] = s
        total += s

    return total, scores

def evaluate_triage(data):
    age = data.get('age')
    sex = data.get('sex', 'OTHER')
    pregnant = bool(data.get('pregnant', False))
    temp_c = data.get('temp_c')
    sbp = data.get('sbp')
    dbp = data.get('dbp')
    spo2 = data.get('spo2')
    pulse = data.get('pulse')
    rr = data.get('rr')
    avpu = data.get('avpu')
    on_oxygen = data.get('on_oxygen')
    symptoms = data.get('symptom_codes', [])
    duration_days = data.get('duration_days', 0)
    history = data.get('history_codes', [])
    free_text = (data.get('free_text') or '').strip()

    flags = []
    missing_required = []
    if temp_c is None: missing_required.append('temp_c')
    if sbp is None: missing_required.append('sbp')
    if dbp is None: missing_required.append('dbp')
    if spo2 is None: missing_required.append('spo2')
    if pulse is None: missing_required.append('pulse')

    if missing_required:
        flags.append('INCOMPLETE')

    if rr is None or avpu is None or on_oxygen is None:
        flags.append('UNDERSTATED')

    if free_text or ('OTHER_TEXT' in symptoms):
        flags.append('NEEDS_REVIEW')

    news2_total, scores = calculate_news2(spo2, sbp, pulse, temp_c, rr, avpu, on_oxygen)

    spo2_s = scores.get('spo2', 0)
    sbp_s = scores.get('sbp', 0)
    pulse_s = scores.get('pulse', 0)
    abnormal_vital = (spo2_s >= 2) or (sbp_s >= 2) or (pulse_s >= 2)

    fired_rules = []

    # Emergency rules
    if news2_total >= 7:
        fired_rules.append('NW-E01')
    if (spo2 is not None and spo2 <= 90) or (sbp is not None and sbp <= 90):
        fired_rules.append('RF-E01')
    if 'SEVERE_BREATHING_DIFFICULTY' in symptoms:
        fired_rules.append('RF-E02')
    if avpu in ('P', 'U'):
        fired_rules.append('RF-E03')
    if 'SEIZURE_ONGOING' in symptoms:
        fired_rules.append('RF-E04')
    if 'SEVERE_BLEEDING' in symptoms:
        fired_rules.append('RF-E05')
    if 'STROKE_SIGNS' in symptoms:
        fired_rules.append('RF-E06')
    if 'SNAKEBITE_OR_POISONING' in symptoms:
        fired_rules.append('RF-E07')
    if 'PREGNANCY_HEAVY_BLEEDING' in symptoms or 'PREGNANCY_CONVULSION' in symptoms:
        fired_rules.append('RF-E08')
    has_rf_e09 = ('CHEST_PAIN' in symptoms) and abnormal_vital
    if has_rf_e09:
        fired_rules.append('RF-E09')

    # Urgent rules
    if 5 <= news2_total <= 6:
        fired_rules.append('NW-U01')
    if any(s == 3 for s in scores.values()):
        fired_rules.append('NW-U02')
    if ('CHEST_PAIN' in symptoms) and not has_rf_e09:
        fired_rules.append('RF-U01')
    if 'BREATHING_DIFFICULTY' in symptoms:
        fired_rules.append('RF-U02')
    if 'VOMITING_DIARRHOEA_DEHYDRATION' in symptoms:
        fired_rules.append('RF-U03')
    if ('FEVER' in symptoms) and duration_days > 3:
        fired_rules.append('RF-U04')
    if (history or (age is not None and age >= 65)) and ((temp_c is not None and temp_c >= 38.1) or (spo2 is not None and spo2 <= 95)):
        fired_rules.append('RF-U05')
    if age is not None and age < 16:
        fired_rules.append('FLOOR-01')
    if pregnant:
        fired_rules.append('FLOOR-02')

    tier_order = {
        'NW-E01': 'EMERGENCY', 'RF-E01': 'EMERGENCY', 'RF-E02': 'EMERGENCY', 'RF-E03': 'EMERGENCY',
        'RF-E04': 'EMERGENCY', 'RF-E05': 'EMERGENCY', 'RF-E06': 'EMERGENCY', 'RF-E07': 'EMERGENCY',
        'RF-E08': 'EMERGENCY', 'RF-E09': 'EMERGENCY',
        'NW-U01': 'URGENT', 'NW-U02': 'URGENT', 'RF-U01': 'URGENT', 'RF-U02': 'URGENT',
        'RF-U03': 'URGENT', 'RF-U04': 'URGENT', 'RF-U05': 'URGENT', 'FLOOR-01': 'URGENT', 'FLOOR-02': 'URGENT'
    }

    has_e = any(tier_order.get(r) == 'EMERGENCY' for r in fired_rules)
    has_u = any(tier_order.get(r) == 'URGENT' for r in fired_rules)

    if has_e:
        priority = 'EMERGENCY'
    elif has_u:
        priority = 'URGENT'
    else:
        priority = 'ROUTINE'

    return {
        'priority': priority,
        'news2_total': news2_total,
        'fired_rules': fired_rules,
        'flags': flags
    }

class TestOracleCases(unittest.TestCase):
    def test_case_01(self):
        res = evaluate_triage({'age': 40, 'temp_c': 37.0, 'sbp': 120, 'dbp': 80, 'spo2': 86, 'pulse': 120, 'symptom_codes': ['SEVERE_BREATHING_DIFFICULTY']})
        self.assertEqual(res['news2_total'], 5)
        self.assertEqual(res['priority'], 'EMERGENCY')
        self.assertTrue(set(['RF-E01', 'RF-E02', 'NW-U01', 'NW-U02']).issubset(set(res['fired_rules'])))
        self.assertIn('UNDERSTATED', res['flags'])

    def test_case_02(self):
        res = evaluate_triage({'age': 50, 'temp_c': 37.0, 'sbp': 120, 'dbp': 80, 'spo2': 92, 'pulse': 100, 'symptom_codes': ['CHEST_PAIN']})
        self.assertEqual(res['news2_total'], 3)
        self.assertEqual(res['priority'], 'EMERGENCY')
        self.assertIn('RF-E09', res['fired_rules'])

    def test_case_03(self):
        res = evaluate_triage({'age': 50, 'temp_c': 37.0, 'sbp': 120, 'dbp': 80, 'spo2': 98, 'pulse': 80, 'symptom_codes': ['CHEST_PAIN']})
        self.assertEqual(res['news2_total'], 0)
        self.assertEqual(res['priority'], 'URGENT')
        self.assertIn('RF-U01', res['fired_rules'])

    def test_case_04(self):
        res = evaluate_triage({'age': 30, 'temp_c': 38.2, 'sbp': 120, 'dbp': 80, 'spo2': 98, 'pulse': 80, 'duration_days': 2, 'symptom_codes': ['FEVER']})
        self.assertEqual(res['news2_total'], 1)
        self.assertEqual(res['priority'], 'ROUTINE')
        self.assertEqual(len(res['fired_rules']), 0)

    def test_case_05(self):
        res = evaluate_triage({'age': 30, 'temp_c': 38.2, 'sbp': 120, 'dbp': 80, 'spo2': None, 'pulse': 80, 'duration_days': 2, 'symptom_codes': ['FEVER']})
        self.assertEqual(res['news2_total'], 1)
        self.assertEqual(res['priority'], 'ROUTINE')
        self.assertIn('INCOMPLETE', res['flags'])

    def test_case_06(self):
        res = evaluate_triage({'age': 8, 'temp_c': 37.0, 'sbp': 120, 'dbp': 80, 'spo2': 98, 'pulse': 80})
        self.assertEqual(res['news2_total'], 0)
        self.assertEqual(res['priority'], 'URGENT')
        self.assertIn('FLOOR-01', res['fired_rules'])

    def test_case_07(self):
        res = evaluate_triage({'age': 40, 'temp_c': 39.2, 'sbp': 105, 'dbp': 70, 'spo2': 93, 'pulse': 112})
        self.assertEqual(res['news2_total'], 7)
        self.assertEqual(res['priority'], 'EMERGENCY')
        self.assertIn('NW-E01', res['fired_rules'])

    def test_case_08(self):
        res = evaluate_triage({'age': 40, 'temp_c': 38.5, 'sbp': 108, 'dbp': 72, 'spo2': 94, 'pulse': 95, 'rr': 22})
        self.assertEqual(res['news2_total'], 6)
        self.assertEqual(res['priority'], 'URGENT')
        self.assertIn('NW-U01', res['fired_rules'])

    def test_case_09(self):
        res = evaluate_triage({'age': 40, 'temp_c': 37.0, 'sbp': 120, 'dbp': 80, 'spo2': 98, 'pulse': 135})
        self.assertEqual(res['news2_total'], 3)
        self.assertEqual(res['priority'], 'URGENT')
        self.assertIn('NW-U02', res['fired_rules'])

    def test_case_10(self):
        res = evaluate_triage({'age': 40, 'temp_c': 37.0, 'sbp': 120, 'dbp': 80, 'spo2': 98, 'pulse': 80, 'free_text': 'burning feet'})
        self.assertEqual(res['news2_total'], 0)
        self.assertEqual(res['priority'], 'ROUTINE')
        self.assertIn('NEEDS_REVIEW', res['flags'])

    def test_case_11(self):
        res = evaluate_triage({'age': 26, 'pregnant': True, 'temp_c': 37.0, 'sbp': 120, 'dbp': 80, 'spo2': 98, 'pulse': 80})
        self.assertEqual(res['news2_total'], 0)
        self.assertEqual(res['priority'], 'URGENT')
        self.assertIn('FLOOR-02', res['fired_rules'])

    def test_case_12(self):
        res = evaluate_triage({'age': 40, 'temp_c': 37.0, 'sbp': 120, 'dbp': 80, 'spo2': 98, 'pulse': 80, 'avpu': 'U'})
        self.assertEqual(res['news2_total'], 3)
        self.assertEqual(res['priority'], 'EMERGENCY')
        self.assertIn('RF-E03', res['fired_rules'])
        self.assertIn('NW-U02', res['fired_rules'])

if __name__ == '__main__':
    unittest.main()
