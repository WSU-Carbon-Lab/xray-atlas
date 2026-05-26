import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const OAUTH_TOKEN_CRYPTO_VERSION = "v1";
const CIPHER_ALG = "aes-256-gcm";
const NONCE_LENGTH_BYTES = 12;
const TAG_LENGTH_BYTES = 16;

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const HEX_RE = /^[0-9a-fA-F]+$/;

/**
 * Server-side encryption/decryption for OAuth tokens stored in `next_auth.account`.
 *
 * Ciphertext uses a versioned prefix (`v1:`) and embeds the random nonce (IV) in the encoded payload.
 * Legacy plaintext token values are treated as non-ciphertext and returned as-is (dual-read rollout).
 */

let cachedKeyString: string | undefined;
let cachedKeyBytes: Buffer | null = null;

function getKeyBytesOrNull(): Buffer | null {
  const keyString = process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
  if (cachedKeyString === keyString) return cachedKeyBytes;
  cachedKeyString = keyString;

  if (!keyString) {
    cachedKeyBytes = null;
    return cachedKeyBytes;
  }

  const trimmed = keyString.trim();

  if (HEX_RE.test(trimmed) && trimmed.length === 64) {
    cachedKeyBytes = Buffer.from(trimmed, "hex");
    return cachedKeyBytes;
  }

  if (BASE64_RE.test(trimmed)) {
    const bytes = Buffer.from(trimmed, "base64");
    if (bytes.length === 32) {
      cachedKeyBytes = bytes;
      return bytes;
    }
  }

  throw new Error("OAUTH_TOKEN_ENCRYPTION_KEY_INVALID");
}

function isCiphertextFormat(value: string): boolean {
  return /^v\d+:/.test(value);
}

function parseCiphertext(value: string): { version: number; payloadB64: string } | null {
  const match = /^v(\d+):(.+)$/.exec(value);
  if (!match) return null;
  const payloadB64 = match[2];
  if (!payloadB64) return null;
  return { version: Number(match[1]), payloadB64 };
}

/**
 * Encrypts a non-null OAuth token using AEAD with a random nonce and embeds the nonce in the output.
 *
 * @param value - Plaintext token string to encrypt.
 * @returns Versioned ciphertext string.
 * @throws When `OAUTH_TOKEN_ENCRYPTION_KEY` is missing or invalid.
 */
export function encryptOAuthToken(value: string): string {
  const keyBytes = getKeyBytesOrNull();
  if (!keyBytes) {
    throw new Error("OAUTH_TOKEN_ENCRYPTION_KEY_MISSING");
  }

  const nonce = randomBytes(NONCE_LENGTH_BYTES);
  const cipher = createCipheriv(CIPHER_ALG, keyBytes, nonce);

  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const payload = Buffer.concat([nonce, ciphertext, tag]);
  const payloadB64 = payload.toString("base64");
  return `${OAUTH_TOKEN_CRYPTO_VERSION}:${payloadB64}`;
}

/**
 * Decrypts a token stored in `next_auth.account`.
 *
 * Dual-read behavior:
 * - Legacy plaintext values (not matching the ciphertext prefix pattern) are returned unchanged.
 * - Malformed or undecryptable ciphertext returns `null` safely.
 *
 * @param value - Token value fetched from the database (plaintext or versioned ciphertext).
 * @returns Plaintext token string, or `null` on decryption failure.
 */
export function decryptOAuthToken(value: string): string | null {
  if (!isCiphertextFormat(value)) return value;

  const parsed = parseCiphertext(value);
  if (!parsed || !Number.isFinite(parsed.version)) return null;
  if (parsed.version !== 1) return null;

  const keyBytes = getKeyBytesOrNull();
  if (!keyBytes) return null;

  if (!BASE64_RE.test(parsed.payloadB64)) return null;

  let payload: Buffer;
  try {
    payload = Buffer.from(parsed.payloadB64, "base64");
  } catch {
    return null;
  }

  const minLength = NONCE_LENGTH_BYTES + TAG_LENGTH_BYTES;
  if (payload.length < minLength) return null;

  const nonce = payload.subarray(0, NONCE_LENGTH_BYTES);
  const tag = payload.subarray(payload.length - TAG_LENGTH_BYTES);
  const ciphertext = payload.subarray(NONCE_LENGTH_BYTES, payload.length - TAG_LENGTH_BYTES);

  try {
    const decipher = createDecipheriv(CIPHER_ALG, keyBytes, nonce);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
  } catch {
    return null;
  }
}

/**
 * Encrypts an optional nullable OAuth token column value.
 *
 * @param value - Token string or `null`.
 * @returns Encrypted ciphertext string, or `null` when input is `null`.
 */
export function encryptNullableOAuthToken(value: string | null): string | null {
  if (value === null) return null;
  return encryptOAuthToken(value);
}

/**
 * Decrypts an optional nullable OAuth token column value.
 *
 * Dual-read behavior applies (legacy plaintext values pass through unchanged).
 *
 * @param value - Token string or `null`.
 * @returns Plaintext token string, or `null` on missing input or decryption failure.
 */
export function decryptNullableOAuthToken(value: string | null): string | null {
  if (value === null) return null;
  return decryptOAuthToken(value);
}

