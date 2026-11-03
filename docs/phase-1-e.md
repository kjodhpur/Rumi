# Phase 1.E: Accessibility & Accommodation-Aware Matching

## Overview
Under Title II of the ADA, Section 504 of the Rehabilitation Act, and the Fair Housing Act, students with verified disabilities or accommodation needs (e.g., emotional support animal / service animal accommodation, private bath / single occupancy bathroom necessity, ground floor accessibility, allergen-free environment) must be accommodated without exposing confidential medical or disability details to other students.

## Architecture
1. **Confidentiality & RLS Isolation**:
   - `accommodation_constraints` table:
     - `id uuid primary key`
     - `school_id uuid not null references public.schools`
     - `user_id uuid not null references public.profiles`
     - `constraint_key text not null` (e.g. `'esa_approved'`, `'single_bathroom'`, `'ground_floor'`, `'allergen_free'`)
     - `set_by uuid not null references public.profiles`
     - `expires_on date`
     - `created_at timestamptz not null default now()`
   - Strict RLS: only `housing_admin` (and staff with disability-coordination scope) can read or modify.
   - Non-admin staff (RA, Analyst, Moderator) and regular students receive 0 rows.
2. **Matching Engine Integration**:
   - Hard filter check: e.g. student A with `'esa_approved'` cannot be paired with student B who marked `pets = 'none'` with hard dealbreaker `pets`.
   - Explanation transparency: when a match is excluded due to accommodation constraint, student-facing UI and API state only `"housing requirement"` with zero medical details.
   - Expired constraints (`expires_on < CURRENT_DATE`) automatically stop applying.
