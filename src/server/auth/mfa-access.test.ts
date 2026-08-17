import { describe as bunDescribe, expect as bunExpect, it as bunIt } from "bun:test";
import {
  sessionMeetsRequiredAal,
  STEP_UP_WINDOW_MS,
} from "~/server/auth/mfa-access";
import { AAL2, AAL3 } from "~/server/auth/aal";
import {
  WEBAUTHN_AUTHENTICATOR,
  type SessionAssuranceSnapshot,
} from "~/server/auth/session-assurance";

type ExpectAssertions = { toBe: (expected: unknown) => void };
const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (actual: unknown) => ExpectAssertions;

function assuranceAt(lastVerifiedAt: Date): SessionAssuranceSnapshot {
  return {
    sessionId: "session-1",
    authenticator: WEBAUTHN_AUTHENTICATOR,
    assertedAal: AAL2,
    passkeyCredentialId: "cred-1",
    lastVerifiedAt,
  };
}

describe("sessionMeetsRequiredAal step-up window", () => {
  it("is satisfied just inside the 2h window", () => {
    const lastVerifiedAt = new Date(Date.now() - (STEP_UP_WINDOW_MS - 60_000));
    expect(sessionMeetsRequiredAal(AAL2, assuranceAt(lastVerifiedAt))).toBe(
      true,
    );
  });

  it("is not satisfied once the 2h window has elapsed", () => {
    const lastVerifiedAt = new Date(Date.now() - (STEP_UP_WINDOW_MS + 60_000));
    expect(sessionMeetsRequiredAal(AAL2, assuranceAt(lastVerifiedAt))).toBe(
      false,
    );
  });

  it("AAL3 checks ignore the step-up window", () => {
    const lastVerifiedAt = new Date(Date.now() - (STEP_UP_WINDOW_MS + 60_000));
    const assurance = { ...assuranceAt(lastVerifiedAt), assertedAal: AAL3 };
    expect(sessionMeetsRequiredAal(AAL3, assurance)).toBe(true);
  });
});
