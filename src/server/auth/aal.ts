export const AAL1 = "aal1" as const;
export const AAL2 = "aal2" as const;
export const AAL3 = "aal3" as const;

export type AssertedAal = typeof AAL1 | typeof AAL2 | typeof AAL3;

const AAL_RANK: Record<AssertedAal, number> = {
  [AAL1]: 1,
  [AAL2]: 2,
  [AAL3]: 3,
};

export interface AuthenticatorAalFields {
  aaguid: string | null;
  attestationFormat: string | null;
  credentialDeviceType: string;
}

/**
 * Returns whether stored authenticator metadata satisfies AAL3 eligibility for v1.
 *
 * Requires direct attestation with a recorded AAGUID. Full FIDO MDS allowlist matching
 * is deferred (see compliance spec section 6.7 open question).
 */
export function isAal3Eligible(authenticator: AuthenticatorAalFields): boolean {
  const fmt = authenticator.attestationFormat?.trim().toLowerCase() ?? "";
  if (fmt === "" || fmt === "none") {
    return false;
  }
  if (!authenticator.aaguid) {
    return false;
  }
  const normalized = authenticator.aaguid.trim().toLowerCase();
  if (
    normalized.length === 0 ||
    normalized === "00000000-0000-0000-0000-000000000000"
  ) {
    return false;
  }
  return authenticator.credentialDeviceType === "singleDevice";
}

/**
 * Maps an enrolled authenticator row to the assurance level asserted after a successful ceremony.
 */
export function assertedAalForAuthenticator(
  authenticator: AuthenticatorAalFields,
): typeof AAL2 | typeof AAL3 {
  return isAal3Eligible(authenticator) ? AAL3 : AAL2;
}

/**
 * Returns whether `asserted` meets or exceeds `required` on the NIST AAL ladder used by the app.
 */
export function meetsAalRequirement(
  asserted: string | null | undefined,
  required: AssertedAal,
): boolean {
  if (!asserted || !(asserted in AAL_RANK)) {
    return false;
  }
  return AAL_RANK[asserted as AssertedAal] >= AAL_RANK[required];
}

/**
 * Returns whether `asserted` is AAL2 or AAL3 (passkey-established session assurance).
 */
export function isPasskeyEstablishedAal(
  asserted: string | null | undefined,
): boolean {
  return meetsAalRequirement(asserted, AAL2);
}
