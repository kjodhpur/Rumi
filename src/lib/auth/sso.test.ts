import { describe, expect, it } from "vitest";
import { isSsoUser, samlServiceProvider, ssoAffiliations, ssoStudentStatus } from "./sso";

describe("school SSO attributes", () => {
  it("recognises SSO users by provider", () => {
    expect(isSsoUser({ app_metadata: { provider: "sso:7f1c" } })).toBe(true);
    expect(
      isSsoUser({ app_metadata: { provider: "email", providers: ["email", "sso:7f1c"] } }),
    ).toBe(true);
    expect(isSsoUser({ app_metadata: { provider: "email" } })).toBe(false);
    // A later code sign-in rewrites app_metadata, but the SSO identity remains.
    expect(
      isSsoUser({
        app_metadata: { provider: "email", providers: ["email"] },
        identities: [{ provider: "email" }, { provider: "sso:7f1c" }],
      }),
    ).toBe(true);
  });

  it("reads affiliation from mapped attributes, custom claims or identity data", () => {
    expect(ssoAffiliations({ user_metadata: { affiliation: ["Student", "member"] } })).toEqual([
      "student",
      "member",
    ]);
    expect(
      ssoAffiliations({
        user_metadata: { custom_claims: { "urn:oid:1.3.6.1.4.1.5923.1.1.1.1": "staff;member" } },
      }),
    ).toEqual(["staff", "member"]);
    expect(
      ssoAffiliations({
        identities: [
          { provider: "sso:x", identity_data: { eduPersonScopedAffiliation: ["student@asu.edu"] } },
        ],
      }),
    ).toEqual(["student"]);
    expect(ssoAffiliations({})).toEqual([]);
    // The IdP's identity data wins over user_metadata, which the student can edit.
    expect(
      ssoAffiliations({
        user_metadata: { affiliation: ["student"] },
        identities: [{ provider: "sso:x", identity_data: { affiliation: ["staff"] } }],
      }),
    ).toEqual(["staff"]);
  });

  it("keeps staff and faculty out of the student pool, and never guesses", () => {
    expect(ssoStudentStatus({ user_metadata: { affiliation: ["student", "employee"] } })).toBe(
      "student",
    );
    expect(ssoStudentStatus({ user_metadata: { affiliation: ["staff", "member"] } })).toBe(
      "not_student",
    );
    expect(ssoStudentStatus({ user_metadata: { affiliation: "faculty" } })).toBe("not_student");
    expect(ssoStudentStatus({ user_metadata: { first_name: "Sam" } })).toBe("unknown");
  });

  it("derives the SAML service provider endpoints from the Supabase URL", () => {
    expect(samlServiceProvider("https://abc.supabase.co/")).toMatchObject({
      acsUrl: "https://abc.supabase.co/auth/v1/sso/saml/acs",
      entityId: "https://abc.supabase.co/auth/v1/sso/saml/metadata",
    });
  });
});
