# Phase 1.G: Outcome-Trained Weights (Research Mode, Staff-Reviewed)

## Overview
Rather than relying purely on static default factor weights, Rumi enables housing researchers and administrators to analyze empirical outcome data (room change requests, conflict escalations, check-in scores <= 2) to identify which lifestyle factors most heavily predict roommate friction at their specific university.

## Architecture
1. **Model Formulation**:
   - Binary outcome: $Y \in \{0, 1\}$ where $1$ denotes a negative outcome (room-change request or low check-in $\le 2$).
   - Feature vector: per-factor mismatch $\Delta_k \in [0, 1]$ between roommates for factors $k \in \{\text{sleep}, \text{cleanliness}, \text{noise}, \text{guests}, \text{smoking}, \text{drinking}, \text{pets}, \text{study}\}$.
   - Regularized logistic regression with L2 ridge penalty $\lambda = 1.0$:
     $$P(Y=1 \mid \mathbf{x}) = \sigma(\beta_0 + \sum_k \beta_k \Delta_k)$$
   - Minimum threshold: requires $N \ge 200$ historical outcome records before fitting to prevent overfitting on sparse samples.
2. **Staff Adoption Safeguard**:
   - Models are generated with status `suggested`.
   - Never auto-adopted.
   - Only a `housing_admin` can review the coefficients, confidence intervals, and suggested weight mappings, then explicitly adopt the model for their school/term.
   - Student personal weights always layer on top of school defaults.
