import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { PrismaAdapterOrcid } from "~/server/auth/prisma-adapter-orcid";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (actual: unknown) => ExpectAssertions;

describe("PrismaAdapterOrcid.listAuthenticatorsByUserId", () => {
  it("filters revoked authenticators at the query level, so excludeCredentials never re-lists a revoked device", async () => {
    const findMany = (args: { where: Record<string, unknown> }) => {
      // This is the behavior Auth.js's Passkey provider relies on to build
      // WebAuthn's excludeCredentials: only non-revoked authenticators for
      // this user should ever reach the registration options.
      expect(args.where).toEqual({ userId: "user-1", revokedAt: null });

      // Simulate the Prisma query already having applied the revokedAt:
      // null filter (a revoked row would never be returned here in real
      // Postgres) -- only the active row survives.
      return Promise.resolve([
        {
          credentialID: "cred-active",
          providerAccountId: "provider-account-1",
          userId: "user-1",
          credentialPublicKey: "public-key-bytes",
          counter: 0n,
          credentialDeviceType: "singleDevice",
          credentialBackedUp: false,
          transports: "internal",
        },
      ]);
    };
    const fakeDb = { authenticator: { findMany } } as never;
    const adapter = PrismaAdapterOrcid(fakeDb);
    const result = await adapter.listAuthenticatorsByUserId!("user-1");

    expect(result.length).toBe(1);
    expect(result[0]!.credentialID).toBe("cred-active");
  });

  it("drops rows with a null userId instead of surfacing them to excludeCredentials", async () => {
    const findMany = () =>
      Promise.resolve([
        {
          credentialID: "cred-orphaned",
          providerAccountId: "provider-account-2",
          userId: null,
          credentialPublicKey: "public-key-bytes",
          counter: 0n,
          credentialDeviceType: "singleDevice",
          credentialBackedUp: false,
          transports: "internal",
        },
      ]);
    const fakeDb = { authenticator: { findMany } } as never;
    const adapter = PrismaAdapterOrcid(fakeDb);
    const result = await adapter.listAuthenticatorsByUserId!("user-1");

    expect(result.length).toBe(0);
  });
});
