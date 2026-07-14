import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { AAL1, AAL2, AAL3 } from "~/server/auth/aal";
import { sessionMeetsRequiredAal } from "~/server/auth/mfa-access";
import {
  WEBAUTHN_AUTHENTICATOR,
  type SessionAssuranceSnapshot,
} from "~/server/auth/session-assurance";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function assurance(
  partial: Partial<SessionAssuranceSnapshot>,
): SessionAssuranceSnapshot {
  return {
    sessionId: "sess-1",
    authenticator: null,
    assertedAal: null,
    passkeyCredentialId: null,
    lastVerifiedAt: new Date(0),
    ...partial,
  };
}

describe("sessionMeetsRequiredAal", () => {
  it("rejects null assurance", () => {
    expect(sessionMeetsRequiredAal(AAL2, null)).toBe(false);
  });

  it("rejects ORCID-only aal1 for AAL2 destructive writes", () => {
    expect(
      sessionMeetsRequiredAal(
        AAL2,
        assurance({ assertedAal: AAL1, authenticator: "orcid_oidc" }),
      ),
    ).toBe(false);
  });

  it("accepts passkey aal2 for AAL2 destructive writes", () => {
    expect(
      sessionMeetsRequiredAal(
        AAL2,
        assurance({
          assertedAal: AAL2,
          authenticator: WEBAUTHN_AUTHENTICATOR,
        }),
      ),
    ).toBe(true);
  });

  it("accepts webauthn authenticator when asserted aal is present at AAL2", () => {
    expect(
      sessionMeetsRequiredAal(
        AAL2,
        assurance({
          assertedAal: AAL2,
          authenticator: WEBAUTHN_AUTHENTICATOR,
        }),
      ),
    ).toBe(true);
  });

  it("requires aal3 on session for AAL3 admin writes", () => {
    expect(
      sessionMeetsRequiredAal(
        AAL3,
        assurance({
          assertedAal: AAL2,
          authenticator: WEBAUTHN_AUTHENTICATOR,
        }),
      ),
    ).toBe(false);
    expect(
      sessionMeetsRequiredAal(
        AAL3,
        assurance({
          assertedAal: AAL3,
          authenticator: WEBAUTHN_AUTHENTICATOR,
        }),
      ),
    ).toBe(true);
  });
});
