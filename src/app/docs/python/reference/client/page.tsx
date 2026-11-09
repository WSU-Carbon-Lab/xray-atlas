import type { Metadata } from "next";
import type { ReactElement } from "react";
import { DocsFlagList } from "~/components/docs/docs-flag-list";

const rows = [
  ["Client(host=None, token=None, cache_dir=None, *, transport=None)", "Atlas connection. Resolves host and token from args, credential file, then env."],
  ["Client.host, Client.authenticated", "Resolved origin and whether a bearer token is attached."],
  ["Client.close()", "Release network resources."],
  ["default_client()", "Shared client used by module-level helpers."],
  ["set_default_client(client)", "Replace the shared client. Pass None for a fresh one."],
  ["login(host=None)", "Run xatlas login and return the saved Credential."],
  ["credential_path()", "Path of the CLI credential file."],
  ["load_credential()", "The Credential to use, or None."],
  ["Credential", "Frozen dataclass: host, token, orcid, scopes, expires_at."],
] as const;

export const metadata: Metadata = { title: "Python reference: client", alternates: { canonical: "/docs/python/reference/client" } };

export default function Page(): ReactElement {
  return (
    <article className="w-full min-w-0 space-y-8">
      <h1 className="font-display text-foreground text-3xl font-semibold">client</h1>
      <DocsFlagList rows={rows} />
    </article>
  );
}
