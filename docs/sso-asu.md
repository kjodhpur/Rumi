# ASU SSO Integration Specifications (Draft — Not Approved)

> [!NOTE]
> This document specifies the SAML 2.0 / OIDC requirements for integrating Rumi with Arizona State University (ASU) Identity Management (IT / Shibboleth IdP).
> **Status:** Draft proposal for ASU IT review — ASU has not yet reviewed or approved this configuration.

---

## 1. Overview & Authentication Model

Rumi supports single sign-on (SSO) via enterprise SAML 2.0 (preferred by ASU Shibboleth) or OpenID Connect (OIDC). Authentication is configured per school.

Students and staff authenticate against ASU's IdP. Rumi provisions and verifies users on receipt of a valid assertion:
- Verification timestamp is stamped from assertion validity.
- Domain restriction checks (`@asu.edu`) remain enforced at the database trigger level as a defense-in-depth measure.
- OTP email login remains available as a school-configurable fallback.

---

## 2. Requirements from ASU IT

To establish the federation, ASU Identity Management will need to provide:

1. **IdP Metadata URL or XML**:
   - Production / Staging SAML 2.0 Entity ID (e.g. `https://webauth.asu.edu/idp/shibboleth`).
   - Single Sign-On Service HTTP-Redirect / HTTP-POST endpoint.
   - Public signing X.509 certificate.

2. **Attribute Release Policy**:
   Rumi requires the following SAML attributes (or OIDC claims) released in the assertion:

| Attribute Name (SAML / OIDC) | Friendly Name | Purpose | Required / Optional |
|---|---|---|---|
| `urn:oid:0.9.2342.19200300.100.1.1` (`uid` / `sub`) | ASURITE ID | Unique persistent identifier | **Required** |
| `urn:oid:0.9.2342.19200300.100.1.3` (`mail`) | School Email | Verification (`@asu.edu`) | **Required** |
| `urn:oid:2.5.4.42` (`givenName`) | First Name | Displayed on profile (first name only) | **Required** |
| `urn:oid:2.5.4.4` (`sn`) | Surname | Truncated to initial for student privacy | **Required** |
| `urn:oid:1.3.6.1.4.1.5923.1.1.1.1` (`eduPersonAffiliation`) | Affiliation | Identifies `student`, `faculty`, `staff` | **Required** |
| `asuPrimaryCollege` / `asuMajor` | Academic College | Powers LLC / Major constraints (Phase 1) | *Optional* |

3. **Affiliation Filtering & FERPA Safeguards**:
   - `eduPersonAffiliation` containing `staff` or `faculty` without `student` are automatically prevented from appearing in the student roommate matching pool.
   - FERPA directory hold flags (if passed via assertion) immediately toggle profile privacy (`is_private = true`).

---

## 3. Service Provider (Rumi) Details for ASU

| Configuration Item | Value |
|---|---|
| **SP Entity ID** | `https://rumi.app/auth/v1/sso/saml/metadata` (or school-specific `urn:rumi:sp:asu`) |
| **ACS URL (Assertion Consumer)** | `https://rumi.app/auth/v1/sso/saml/acs` |
| **NameID Format** | `urn:oasis:names:tc:SAML:2.0:nameid-format:persistent` |
| **Signing / Encryption** | HTTP-POST with SHA-256 signatures; encrypted assertions supported |
| **RelayState Handling** | Supported (used for deep linking from StarRez or Canvas LMS) |

---

## 4. Pre-Arrival Students Without ASURITE Active

For newly admitted students who do not yet have an active ASURITE SSO credential:
- Rumi provides **Pre-Arrival Admitted Student Mode** (Phase 3.1).
- Admissions staff upload an allowlist of hashed personal email addresses.
- Pre-arrival admits match exclusively within their admitted cohort track.
- Upon receiving ASU credentials and first SSO login, accounts link seamlessly via email verification without losing previous matches or messages.
