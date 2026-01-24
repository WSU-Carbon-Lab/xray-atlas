import { env } from "~/env";

export async function GET() {
  const orcidBaseUrl = env.ORCID_USE_SANDBOX === "true" 
    ? "https://sandbox.orcid.org" 
    : "https://orcid.org";

  return Response.json({
    hasClientId: !!env.ORCID_CLIENT_ID,
    clientId: env.ORCID_CLIENT_ID ? `${env.ORCID_CLIENT_ID.substring(0, 10)}...` : "NOT SET",
    hasClientSecret: !!env.ORCID_CLIENT_SECRET,
    useSandbox: env.ORCID_USE_SANDBOX,
    orcidBaseUrl,
    authUrl: env.AUTH_URL,
    expectedSandboxClientId: "APP-AYPOSB8GP6KN7ZF2",
    isUsingSandbox: env.ORCID_USE_SANDBOX === "true",
  }, { 
    headers: { "Content-Type": "application/json" } 
  });
}
