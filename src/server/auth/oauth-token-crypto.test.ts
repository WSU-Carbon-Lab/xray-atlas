import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  decryptOAuthToken,
  decryptNullableOAuthToken,
  encryptOAuthToken,
  encryptNullableOAuthToken,
} from "~/server/auth/oauth-token-crypto";

process.env.OAUTH_TOKEN_ENCRYPTION_KEY = (() => {
  const bytes = Buffer.alloc(32);
  for (let i = 0; i < 32; i += 1) bytes[i] = i;
  return bytes.toString("base64");
})();

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("oauth-token-crypto", () => {
  it("roundtrips encrypt/decrypt", () => {
    const value = "hello-oauth-token";
    const encrypted = encryptOAuthToken(value);
    expect(encrypted.startsWith("v1:")).toBe(true);
    const decrypted = decryptOAuthToken(encrypted);
    expect(decrypted).toBe(value);
  });

  it("dual-read returns legacy plaintext unchanged", () => {
    const legacy = "legacy-plaintext-token";
    const decrypted = decryptOAuthToken(legacy);
    expect(decrypted).toBe(legacy);
  });

  it("decryptNullable passes null through", () => {
    expect(encryptNullableOAuthToken(null)).toBe(null);
    expect(decryptNullableOAuthToken(null)).toBe(null);
  });

  it("returns null for malformed ciphertext", () => {
    const malformed = "v1:short";
    const decrypted = decryptOAuthToken(malformed);
    expect(decrypted).toBe(null);
  });

  it("returns null for tampered ciphertext", () => {
    const value = "tamper-me";
    const encrypted = encryptOAuthToken(value);
    const lastChar = encrypted.slice(-1);
    const tamperedLast =
      lastChar === "A" ? "B" : lastChar === "B" ? "C" : "A";
    const tampered = `${encrypted.slice(0, -1)}${tamperedLast}`;
    const decrypted = decryptOAuthToken(tampered);
    expect(decrypted).toBe(null);
  });
});

