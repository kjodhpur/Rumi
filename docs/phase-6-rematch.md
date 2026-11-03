# Phase 6.1 & 6.2: End-of-Year "Room Again?" Survey & Next-Year Re-Match

## Overview
Retaining successful roommate pairings from one academic year into the next dramatically reduces campus housing turnover, mediation loads, and administrative placement costs.

1. **Phase 6.1 End-of-Year "Room Again?" Survey**:
   - Sent 3 weeks prior to term conclusion.
   - 4-question pulse:
     1. "Would you room together again?" (`yes` / `maybe` / `no`)
     2. Overall experience rating (1 to 5)
     3. Biggest win (e.g., shared schedules, great communication, lifelong friend)
     4. Friction tags (noise, cleanliness, guests, schedule, None)
   - Stored in `outcome_surveys` (unique per user per term).
   - Aggregated privately for staff outcomes and research.

2. **Phase 6.2 Next-Year Re-Match**:
   - Returning student term opens with a one-tap group carry-forward prompt ("Keep your group for next year?").
   - If all roommates (or a sub-group of $\ge 2$) answered `yes` or `maybe`, they can carry forward as a confirmed pairing in the new term without repeating matching.
   - Automatically verifies that hard dealbreakers remain unviolated.
