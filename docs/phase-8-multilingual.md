# Phase 8 — Multilingual Expansion & International Student Accessibility

Implements master prompt §8 Multilingual Expansion for student flows.

## Architecture

1. **Locales**:
   - `en`: English (Default)
   - `es`: Español (Complete for student flows: onboarding, matching, agreements, check-ins, settings)
   - `zh`: 简体中文 (Scaffolded, flagged "needs professional translation" per master prompt)
   - `hi`: हिन्दी (Scaffolded, flagged "needs professional translation" per master prompt)

2. **Zero-Friction Translation (`src/lib/i18n/`)**:
   - `t(key, locale)`: Pure lookup function with parameter interpolation and fallback to `en` if a key is absent.
   - `getDictionary(locale)`: Returns typed dictionary for server and client components.
   - CI missing-key check ensuring parity across all supported strings.

3. **User Preference**:
   - Preferred language stored in `user_settings` and browser cookie `rumi_locale`.
   - Settings language selector in `/settings`.
