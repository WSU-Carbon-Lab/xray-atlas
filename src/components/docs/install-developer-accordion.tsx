"use client";

/**
 * Collapsed developer notes on the installing page.
 *
 * Covers a GitHub checkout of the CLI and a login aimed at a local Atlas
 * server. The public install commands stay outside this accordion.
 */

import { Accordion } from "@heroui/react";
import { ChevronDown } from "lucide-react";
import type { ReactElement } from "react";

const codeClass = "text-foreground font-mono text-sm";
const preClass =
  "border-border bg-background overflow-x-auto rounded-lg border px-3 py-2";

/**
 * Renders the build-from-scratch and local-login panels.
 */
export function InstallDeveloperAccordion(): ReactElement {
  return (
    <Accordion
      hideSeparator
      variant="surface"
      aria-label="Developer install"
      className="border-border w-full rounded-lg border"
    >
      <Accordion.Item id="build-from-scratch">
        <Accordion.Heading>
          <Accordion.Trigger className="text-sm">
            Build from scratch
            <Accordion.Indicator>
              <ChevronDown className="size-4" aria-hidden />
            </Accordion.Indicator>
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body className="text-muted space-y-3 text-sm">
            <p>
              Clone the extensions repository and install the CLI from the{" "}
              <code className="text-foreground">cli</code> directory. Bun must
              be on <code className="text-foreground">PATH</code>.
            </p>
            <pre className={preClass}>
              <code
                className={codeClass}
              >{`git clone --recurse-submodules https://github.com/WSU-Carbon-Lab/extensions.git
cd extensions/cli
bun install
bun run install-bin`}</code>
            </pre>
            <p>
              The installer asks for{" "}
              <code className="text-foreground">xatlas</code>,{" "}
              <code className="text-foreground">xa</code>, or{" "}
              <code className="text-foreground">atlas</code>. Pass the name to
              skip the prompt:{" "}
              <code className="text-foreground">bun run install-bin -- xa</code>
              .
            </p>
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item id="local-site">
        <Accordion.Heading>
          <Accordion.Trigger className="text-sm">
            Sign in to a local site
            <Accordion.Indicator>
              <ChevronDown className="size-4" aria-hidden />
            </Accordion.Indicator>
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body className="text-muted space-y-3 text-sm">
            <p>
              Login uses{" "}
              <code className="text-foreground">https://xrayatlas.wsu.edu</code>{" "}
              unless you pass <code className="text-foreground">--host</code>.
              Point that flag at a local server when you want the passkey page
              and the credential issued there.
            </p>
            <pre className={preClass}>
              <code className={codeClass}>
                xatlas login --host http://127.0.0.1:3000
              </code>
            </pre>
            <p>
              The host is saved with the credential, so later commands keep
              using that server until the next login.
            </p>
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
