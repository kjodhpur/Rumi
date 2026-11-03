# Phase 1 Constraints: LLC, Major & Residential-College School Rules

## Overview
Universities like ASU enforce institutional residential policies, such as:
1. **Freshman Academic College Rule**: First-year students living on campus must match with roommates enrolled in the same academic college (e.g. Fulton Schools of Engineering, W.P. Carey School of Business, The College of Liberal Arts and Sciences).
2. **Living Learning Communities (LLC)**: Students admitted to specialized LLC cohorts (e.g. Honors College, Global Health Living-Learning, Women in STEM) can only be paired within that designated community.
3. **Residential College Exclusivity**: Students assigned to specific residential college quads or buildings must match within that residential boundary.

## Architecture
1. **Data Model**:
   - `school_rules`: Table keyed by `(school_id, rule_type)` holding rule enablement and parameters.
   - Profile attributes: `academic_college`, `residential_college`, `llc`.
2. **Pure Engine Integration**:
   - `passesSchoolRules(a, b, rules)` evaluated inside `hardFilterFailure`.
   - Returns `{ kind: "school_rule", ruleType }` without leaking private demographic details.
   - Clean reason string: `"campus housing policy requirement"`.
