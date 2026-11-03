# Phase 3.1 & 3.2: Incoming-Student Pre-Arrival Mode + Transfer & Grad Tracks

## Overview
Phase 3 extends Rumi's student onboarding and matching system to accommodate students before their official enrollment and across distinct student populations:

1. **Phase 3.1 Incoming-Student Pre-Arrival Mode**:
   - Admitted students who do not yet have university SSO or university email accounts can be admitted to Rumi via a school-controlled admissions allowlist.
   - Staff upload an allowlist of SHA-256 hashed personal email addresses for a specific admit term.
   - Incoming admitted students sign up with their personal email; the server checks `admit_allowlist` and flags `profiles.pre_arrival = true`.
   - Admitted pre-arrival students enter a separate matching pool: they are matched only with other pre-arrival students of the same term.
   - Once their official university email or SSO is connected, their account links and `pre_arrival` is cleared.

2. **Phase 3.2 Transfer & Grad Tracks**:
   - Schools configure population tracks: `freshman`, `returning`, `transfer`, `grad`.
   - Tracks maintain separate matching pools by default so transfer students and graduate students match with their peers.
   - Students select their track during onboarding or profile editing, with optional staff administrative lock.
