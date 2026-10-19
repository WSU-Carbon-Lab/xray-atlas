"use client";

/**
 * Platform install guide for the catalog CLI.
 *
 * macOS, Linux, and Windows use the site installers. Homebrew, Scoop, and
 * the Bun package index are shown with the commands they will use once those
 * distributions exist.
 */

import { Accordion, Alert, Tabs } from "@heroui/react";
import { ChevronDown } from "lucide-react";
import type { ReactElement } from "react";
import { site } from "~/app/brand";
import { DocsCommandBlock } from "~/components/docs/docs-command-block";
import { latestDocsVersion } from "~/lib/docs-versions";

const installUrl = `${site.url}/install`;
const installPs1Url = `${site.url}/install.ps1`;

const shellCommand = `curl -fsSL ${installUrl} | bash`;
const shellNamedCommand = `curl -fsSL ${installUrl} | bash -s -- xa`;
const powershellCommand = `irm ${installPs1Url} | iex`;
const powershellNamedCommand = `iex "& {$(irm ${installPs1Url})} xa"`;
const cmdCommand = `powershell -c "irm ${installPs1Url} | iex"`;

const packageTabs = [
  {
    id: "homebrew",
    label: "Homebrew",
    command: "brew install xatlas",
  },
  {
    id: "scoop",
    label: "Scoop",
    command: "scoop install xatlas",
  },
  {
    id: "bun",
    label: "Bun",
    command: "bun install -g xatlas",
  },
] as const;

/**
 * Renders the install tabs, the version check, and the PATH notes.
 */
export function InstallGuide(): ReactElement {
  const version = latestDocsVersion().id;

  return (
    <div className="space-y-8">
      <Tabs className="w-full" defaultSelectedKey="unix" variant="secondary">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Install platform">
            <Tabs.Tab id="unix">
              macOS and Linux
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="windows">
              Windows
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="packages">
              Package managers
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="unix" className="space-y-4 pt-4">
          <div className="space-y-2">
            <h2 className="text-foreground text-base font-semibold">
              macOS, Linux, WSL
            </h2>
            <p className="text-muted text-sm">
              Recommended. Bun must already be on{" "}
              <code className="text-foreground">PATH</code>. The default command
              name is <code className="text-foreground">xatlas</code>.
            </p>
            <DocsCommandBlock command={shellCommand} />
          </div>
          <div className="space-y-2">
            <h3 className="text-foreground text-sm font-medium">
              Choose another command name
            </h3>
            <p className="text-muted text-sm">
              <code className="text-foreground">xa</code> and{" "}
              <code className="text-foreground">atlas</code> are the other
              names. This example selects{" "}
              <code className="text-foreground">xa</code>.
            </p>
            <DocsCommandBlock command={shellNamedCommand} />
          </div>
        </Tabs.Panel>
        <Tabs.Panel id="windows" className="space-y-6 pt-4">
          <div className="space-y-2">
            <h2 className="text-foreground text-base font-semibold">
              Windows PowerShell
            </h2>
            <p className="text-muted text-sm">
              The prompt shows <code className="text-foreground">PS</code> in
              PowerShell. Bun must already be on{" "}
              <code className="text-foreground">PATH</code>.
            </p>
            <DocsCommandBlock command={powershellCommand} />
            <p className="text-muted text-sm">
              Choose <code className="text-foreground">xa</code> or{" "}
              <code className="text-foreground">atlas</code> by passing the
              name. This example selects{" "}
              <code className="text-foreground">xa</code>.
            </p>
            <DocsCommandBlock command={powershellNamedCommand} />
          </div>
          <div className="space-y-2">
            <h2 className="text-foreground text-base font-semibold">
              Windows CMD
            </h2>
            <p className="text-muted text-sm">
              The prompt is a drive letter without{" "}
              <code className="text-foreground">PS</code>. If{" "}
              <code className="text-foreground">irm</code> is not recognized,
              you are in CMD. Run the installer through PowerShell.
            </p>
            <DocsCommandBlock command={cmdCommand} />
          </div>
        </Tabs.Panel>
        <Tabs.Panel id="packages" className="space-y-3 pt-4">
          <p className="text-muted text-sm">
            Package distribution coming soon. These are the commands the indexes
            will use.
          </p>
          <Tabs
            className="w-full"
            defaultSelectedKey="homebrew"
            variant="secondary"
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label="Package manager">
                {packageTabs.map((tab) => (
                  <Tabs.Tab key={tab.id} id={tab.id}>
                    {tab.label}
                    <Tabs.Indicator />
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>
            {packageTabs.map((tab) => (
              <Tabs.Panel key={tab.id} id={tab.id} className="pt-3">
                <DocsCommandBlock command={tab.command} />
              </Tabs.Panel>
            ))}
          </Tabs>
        </Tabs.Panel>
      </Tabs>

      <section className="space-y-3">
        <h2 className="text-foreground text-xl font-semibold">
          Check the install
        </h2>
        <p className="text-muted text-sm">
          Open a new terminal after the installer finishes, then run:
        </p>
        <DocsCommandBlock command="xatlas --version" output={`# ${version}`} />
        <p className="text-muted text-sm">
          A working install prints{" "}
          <code className="text-foreground">{version}</code>. The shell and
          PowerShell installers keep the package under{" "}
          <code className="text-foreground">$XDG_DATA_HOME/xatlas/cli</code> or{" "}
          <code className="text-foreground">~/.local/share/xatlas/cli</code>{" "}
          (Windows:{" "}
          <code className="text-foreground">%LOCALAPPDATA%\xatlas\cli</code>
          ). A later install replaces the previous launcher. A name that already
          belongs to a different program is left in place.
        </p>
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Command not found</Alert.Title>
            <Alert.Description>
              If the shell reports that{" "}
              <code className="text-foreground">xatlas</code> is not found, the
              install directory is not on{" "}
              <code className="text-foreground">PATH</code> yet. The command is
              linked into{" "}
              <code className="text-foreground">$BUN_INSTALL/bin</code>, or{" "}
              <code className="text-foreground">~/.bun/bin</code> when{" "}
              <code className="text-foreground">BUN_INSTALL</code> is unset.
            </Alert.Description>
          </Alert.Content>
        </Alert>
        <Accordion
          hideSeparator
          variant="surface"
          aria-label="PATH setup"
          className="border-border w-full rounded-lg border"
        >
          <Accordion.Item id="path">
            <Accordion.Heading>
              <Accordion.Trigger className="text-sm">
                Add the command to your PATH
                <Accordion.Indicator>
                  <ChevronDown className="size-4" aria-hidden />
                </Accordion.Indicator>
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="space-y-4">
                <div className="space-y-2">
                  <p className="text-muted text-sm">zsh</p>
                  <DocsCommandBlock
                    command={
                      "echo 'export PATH=\"$HOME/.bun/bin:$PATH\"' >> ~/.zshrc"
                    }
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-muted text-sm">bash</p>
                  <DocsCommandBlock
                    command={
                      "echo 'export PATH=\"$HOME/.bun/bin:$PATH\"' >> ~/.bashrc"
                    }
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-muted text-sm">fish</p>
                  <DocsCommandBlock command="fish_add_path $HOME/.bun/bin" />
                </div>
                <div className="space-y-2">
                  <p className="text-muted text-sm">Windows PowerShell</p>
                  <DocsCommandBlock
                    command={
                      '[Environment]::SetEnvironmentVariable("Path", "$env:USERPROFILE\\.bun\\bin;" + [Environment]::GetEnvironmentVariable("Path", "User"), "User")'
                    }
                  />
                </div>
                <p className="text-muted text-sm">
                  Open a new terminal after changing{" "}
                  <code className="text-foreground">PATH</code>. When{" "}
                  <code className="text-foreground">BUN_INSTALL</code> is set,
                  use <code className="text-foreground">$BUN_INSTALL/bin</code>{" "}
                  instead of <code className="text-foreground">~/.bun/bin</code>
                  .
                </p>
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </section>
    </div>
  );
}
