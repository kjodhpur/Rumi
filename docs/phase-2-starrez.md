# Phase 2 — StarRez REST Adapter, Questionnaire Import & Housing Integrations

Builds out StarRez REST adapter (2b), questionnaire answer mapping and prefill (2d), housing adapter interface with Entrata/Yardi stubs (2e), and entry-point deep linking with source attribution (2c, 3.3).

## Architecture

1. **`HousingSystemAdapter` Interface (`src/lib/integrations/housing/adapter.ts`)**:
   - `testConnection()`: Validates API connection and credentials.
   - `pushRoommateGroups(groups)`: Pushes confirmed pairings to housing provider with rate limiting (~100 calls/60s token bucket) and exponential backoff retry.
   - `pullAssignments(since?)`: Imports room/building assignments into `assignments`.
   - `pullRoomChanges(since?)`: Pulls room swap/change requests.
   - `importQuestionnaire(records)`: Imports and maps answers into `imported_answers`.
   - Implementations:
     - `StarRezRestAdapter`: Token-bucket throttled REST client using school encrypted credentials (`integration_credentials`).
     - `StarRezCsvAdapter`: CSV import/export.
     - `EntrataStubAdapter` & `YardiStubAdapter`: Throw `NotConfiguredError` and surface "Contact us" for off-campus partner integrations.

2. **StarRez Questionnaire Import (2d)**:
   - Maps StarRez question codes (`SLEEP_TIME`, `CLEANLINESS`, `GUESTS`, etc.) to Rumi factor keys (`sleep`, `cleanliness`, `guests`, etc.).
   - Stored in `imported_answers`. Unconfirmed answers do not affect matching scores until student confirms them on onboarding.

3. **Entry Points & Source Attribution (2c, 3.3)**:
   - `/s/[school]?src=starrez|canvas|asuapp`: School landing page with referral tracking in `link_attributions`.
   - Embeddable widget snippet ("Find your roommate on Rumi") and QR code generation for the StarRez portal and Canvas LMS.

4. **Security & FERPA**:
   - Zero credentials stored in plaintext (`credentials_enc` uses AES-256-GCM).
   - Only `housing_admin` can manage credentials; run logs in `integration_runs`.
