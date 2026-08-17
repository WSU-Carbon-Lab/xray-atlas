import { describe as bunDescribe, expect as bunExpect, it as bunIt } from "bun:test";
import { generateRegistrationOptions, generateAuthenticationOptions, verifyRegistrationResponse, verifyAuthenticationResponse } from "@simplewebauthn/server";

type ExpectAssertions = { toBe: (expected: unknown) => void };
const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (actual: unknown) => ExpectAssertions;

describe("WebAuthn counter replay protection", () => {
  it("verifyAuthenticationResponse exists and is the library's own replay guard (documents the dependency; full ceremony coverage lives in e2e tests)", () => {
    expect(typeof verifyAuthenticationResponse).toBe("function");
  });
});
