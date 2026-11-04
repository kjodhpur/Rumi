/**
 * School single sign-on (Phase 3). Pure: reading the identity provider's attributes off a
 * Supabase user. SAML attribute mapping on the Supabase provider puts released attributes
 * in user_metadata (custom_claims for unmapped ones); OIDC claims land in identity_data.
 */

export interface SsoUserLike {
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
  identities?: { provider?: string; identity_data?: Record<string, unknown> | null }[] | null;
}

const isSsoProvider = (p: unknown) => typeof p === "string" && p.startsWith("sso:");

/**
 * Supabase names SSO providers "sso:<provider id>". The identity is the reliable signal: a
 * later code or link sign-in rewrites app_metadata.provider, but the SSO identity stays, and
 * only a real school sign-on can create one.
 */
export function isSsoUser(user: SsoUserLike): boolean {
  const providers = user.app_metadata?.providers;
  return (
    isSsoProvider(user.app_metadata?.provider) ||
    (Array.isArray(providers) && providers.some(isSsoProvider)) ||
    (user.identities ?? []).some((i) => isSsoProvider(i.provider))
  );
}

const AFFILIATION_KEYS = [
  "affiliation",
  "eduPersonAffiliation",
  "edu_person_affiliation",
  "urn:oid:1.3.6.1.4.1.5923.1.1.1.1",
  "eduPersonScopedAffiliation",
];

function values(v: unknown): string[] {
  if (typeof v === "string") return v.split(/[;,\s]+/).filter(Boolean);
  if (Array.isArray(v)) return v.flatMap(values);
  return [];
}

function withClaims(data: Record<string, unknown>): Record<string, unknown>[] {
  const claims = data.custom_claims;
  return claims && typeof claims === "object" ? [data, claims as Record<string, unknown>] : [data];
}

/**
 * Lowercased affiliations ("student", "staff", …), scoped forms ("student@asu.edu") reduced.
 * The SSO identity's data (written by the IdP) wins over user_metadata, which students can edit.
 */
export function ssoAffiliations(user: SsoUserLike): string[] {
  const ssoData = (user.identities ?? [])
    .filter((i) => isSsoProvider(i.provider) && i.identity_data)
    .flatMap((i) => withClaims(i.identity_data!));
  const sources = ssoData.length ? ssoData : withClaims(user.user_metadata ?? {});
  const out = new Set<string>();
  for (const source of sources)
    for (const key of AFFILIATION_KEYS)
      for (const v of values(source[key])) out.add(v.toLowerCase().split("@")[0]);
  return [...out];
}

/**
 * Who belongs in the student pool. With no affiliation released we can't tell, so the
 * school-email check alone decides (as with code sign-in). Released affiliations without
 * "student" (staff, faculty, employee, affiliate…) keep the account out of matching.
 */
export function ssoStudentStatus(user: SsoUserLike): "student" | "not_student" | "unknown" {
  const list = ssoAffiliations(user);
  if (!list.length) return "unknown";
  return list.some((a) => a === "student" || a === "member-student") ? "student" : "not_student";
}

/** The service provider details a school's IT team needs (Supabase Auth hosts the SAML SP). */
export function samlServiceProvider(supabaseUrl: string) {
  const base = supabaseUrl.replace(/\/$/, "");
  return {
    entityId: `${base}/auth/v1/sso/saml/metadata`,
    metadataUrl: `${base}/auth/v1/sso/saml/metadata`,
    acsUrl: `${base}/auth/v1/sso/saml/acs`,
    nameIdFormat: "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent",
  };
}
