import type { Metadata } from "next";
import { ApiV1Resource } from "~/components/about/api-v1-reference";

export const metadata: Metadata = {
  title: "API v1 account",
  description:
    "Version 1 identity, token management, name lookup, and attribution claims for a xatlas credential.",
  alternates: {
    canonical: "/docs/api/v1/account",
  },
};

export default function ApiV1AccountPage() {
  return (
    <ApiV1Resource
      tags={["Account", "Attributions", "Lookup"]}
      title="Account"
      lede="Identify the credential, list and revoke tokens, resolve molecule, instrument, and edge names to ids, and accept or decline attribution claims. Every route here requires a bearer token."
    />
  );
}
