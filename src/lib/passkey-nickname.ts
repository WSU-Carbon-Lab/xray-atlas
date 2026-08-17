const UA_PLATFORM_PATTERNS: Array<[RegExp, string]> = [
  [/iPhone/, "iPhone"],
  [/iPad/, "iPad"],
  [/Macintosh/, "Mac"],
  [/Android/, "Android"],
  [/Windows/, "Windows PC"],
  [/Linux/, "Linux"],
];

const UA_BROWSER_PATTERNS: Array<[RegExp, string]> = [
  // Chromium Edge identifies itself as "Edg/" on desktop, "EdgA/" on Android,
  // and "EdgiOS/" on iOS (legacy EdgeHTML used "Edge/"). All variants also
  // carry a "Chrome/" token, so this must be checked before the Chrome rule.
  [/Edg(?:e|A|iOS)?\//, "Edge"],
  // Opera uses "OPR/" on desktop and Android, but "OPiOS/" on iOS (Opera for
  // iOS is WebKit-based, like all iOS browsers). Both also carry "Chrome/" or
  // "Safari/" tokens, so this must be checked before those rules.
  [/OP(?:R|iOS)\//, "Opera"],
  [/CriOS\//, "Chrome"],
  [/Chrome\//, "Chrome"],
  [/FxiOS\//, "Firefox"],
  [/Firefox\//, "Firefox"],
  [/Safari\//, "Safari"],
];

function matchFirst(
  ua: string,
  patterns: Array<[RegExp, string]>,
): string | null {
  for (const [pattern, label] of patterns) {
    if (pattern.test(ua)) return label;
  }
  return null;
}

/**
 * Derives a human-friendly default passkey label from the registration
 * request's User-Agent and the WebAuthn credential device type.
 */
export function deriveDefaultPasskeyNickname(
  userAgent: string | null,
  credentialDeviceType: string,
): string {
  const fallback =
    credentialDeviceType === "multiDevice" ? "Synced passkey" : "Passkey";
  if (!userAgent) {
    return fallback;
  }
  const platform = matchFirst(userAgent, UA_PLATFORM_PATTERNS);
  const browser = matchFirst(userAgent, UA_BROWSER_PATTERNS);
  if (platform && browser) {
    return `${browser} on ${platform}`;
  }
  return platform ?? fallback;
}
