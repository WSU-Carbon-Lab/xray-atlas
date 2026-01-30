export function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.AUTH_URL!;
}
