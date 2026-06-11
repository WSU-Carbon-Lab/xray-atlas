"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card, Checkbox, Label, Spinner } from "@heroui/react";
import { Check, Cpu, FolderOpen, Shield } from "lucide-react";
import { isDirectoryPickerSupported } from "~/features/dashboard/lib/localDirectoryBrowser";
import {
  RecentFolderPills,
  type RecentFolderPillsProps,
} from "./folder-picker-prompt";

type StxmWorkspaceOnboardingProps = {
  folderSelected: boolean;
  folderDisplayName: string | null;
  computeConsentGranted: boolean;
  isPicking: boolean;
  isRestoringFolder: boolean;
  onPickFolder: () => void;
  onGrantCompute: () => void;
  recentFolders: RecentFolderPillsProps["folders"];
  onOpenRecentFolder: (handleKey: string) => void;
};

/**
 * Entry gate for the ALS 5.3.2.2 STXM workspace: local folder access and compute consent.
 */
export function StxmWorkspaceOnboarding({
  folderSelected,
  folderDisplayName,
  computeConsentGranted,
  isPicking,
  isRestoringFolder,
  onPickFolder,
  onGrantCompute,
  recentFolders,
  onOpenRecentFolder,
}: StxmWorkspaceOnboardingProps) {
  const [computeAcknowledged, setComputeAcknowledged] = useState(false);
  const directoryPickerSupported = isDirectoryPickerSupported();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-4">
      <div className="text-center">
        <h2 className="text-foreground text-xl font-semibold tracking-tight">
          ALS Beamline 5.3.2.2 — STXM processing
        </h2>
        <p className="text-muted mt-2 text-sm leading-relaxed">
          Process line scans on your device. Grant local file access and
          acknowledge browser-side compute before opening the workspace.
        </p>
      </div>

      <Card className="border-border bg-surface border">
        <Card.Header className="border-border border-b px-5 py-4">
          <Card.Title className="text-base">Before you begin</Card.Title>
          <Card.Description className="text-muted text-sm">
            Raw <span className="font-mono">.hdr</span> /{" "}
            <span className="font-mono">.xim</span> files are read from folders
            you choose. Spectra reduction runs on your CPU until you optionally
            upload to Atlas.
          </Card.Description>
        </Card.Header>
        <Card.Content className="space-y-5 px-5 py-5">
          <section className="space-y-3">
            <div className="flex items-start gap-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  folderSelected
                    ? "bg-success/15 text-success"
                    : "bg-default/40 text-muted"
                }`}
                aria-hidden
              >
                {folderSelected ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <FolderOpen className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <h3 className="text-foreground text-sm font-medium">
                  Local files
                </h3>
                <p className="text-muted text-sm leading-relaxed">
                  Select a beamtime root folder on this computer. The browser
                  File System Access API lists scans locally; data stays on your
                  device until you choose to upload a reduced spectrum.
                </p>
                {folderSelected && folderDisplayName ? (
                  <p className="text-foreground text-sm">
                    Selected:{" "}
                    <span className="font-medium">{folderDisplayName}</span>
                  </p>
                ) : null}
                {!directoryPickerSupported ? (
                  <p className="text-warning text-xs leading-relaxed">
                    Folder selection requires Chrome or Edge with File System
                    Access API support. Safari and Firefox cannot browse local
                    directories in-browser yet.
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="primary"
                    size="md"
                    isDisabled={
                      !directoryPickerSupported ||
                      isPicking ||
                      isRestoringFolder
                    }
                    onPress={onPickFolder}
                  >
                    {isPicking ? (
                      <>
                        <Spinner size="sm" />
                        Opening picker...
                      </>
                    ) : (
                      "Select data folder"
                    )}
                  </Button>
                  {isRestoringFolder ? (
                    <span className="text-muted inline-flex items-center gap-2 text-xs">
                      <Spinner size="sm" />
                      Restoring previous folder...
                    </span>
                  ) : null}
                </div>
                <RecentFolderPills
                  folders={recentFolders}
                  onOpen={onOpenRecentFolder}
                  className="pt-1"
                />
              </div>
            </div>
          </section>

          <section className="border-border space-y-3 border-t pt-5">
            <div className="flex items-start gap-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  computeConsentGranted
                    ? "bg-success/15 text-success"
                    : "bg-default/40 text-muted"
                }`}
                aria-hidden
              >
                {computeConsentGranted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Cpu className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <h3 className="text-foreground text-sm font-medium">
                  Local compute
                </h3>
                <p className="text-muted text-sm leading-relaxed">
                  Region means, optical-density normalization, bare-atom
                  fitting, and Kramers–Kronig transforms run in your browser
                  using local CPU. Large line scans or stacks may take
                  noticeable time and memory.
                </p>
                {computeConsentGranted ? (
                  <p className="text-success text-sm">
                    Allowed for this browser tab.
                  </p>
                ) : (
                  <>
                    <Checkbox
                      id="stxm-compute-consent"
                      variant="secondary"
                      className="items-start gap-3"
                      isSelected={computeAcknowledged}
                      onChange={setComputeAcknowledged}
                    >
                      <Checkbox.Control className="border-border bg-surface ring-offset-surface data-[selected=true]:border-accent data-[selected=true]:bg-accent data-[focus-visible=true]:ring-accent border-2 data-[focus-visible=true]:ring-2">
                        <Checkbox.Indicator className="text-accent-foreground" />
                      </Checkbox.Control>
                      <Checkbox.Content>
                        <Label
                          htmlFor="stxm-compute-consent"
                          className="text-foreground cursor-pointer text-sm leading-snug font-normal"
                        >
                          I understand processing runs on this device and may be
                          CPU-intensive
                        </Label>
                      </Checkbox.Content>
                    </Checkbox>
                    <Button
                      variant="secondary"
                      size="md"
                      isDisabled={!computeAcknowledged}
                      onPress={onGrantCompute}
                    >
                      Allow local processing
                    </Button>
                  </>
                )}
              </div>
            </div>
          </section>

          <section className="border-border flex items-start gap-3 border-t pt-5">
            <Shield
              className="text-muted mt-0.5 h-4 w-4 shrink-0"
              aria-hidden
            />
            <p className="text-muted text-xs leading-relaxed">
              No raw scan files are sent to Atlas servers during local
              reduction. Optional upload sends only the spectrum and metadata
              you confirm.{" "}
              <Link href="/wiki/atlas" className="text-accent hover:underline">
                Learn more
              </Link>
            </p>
          </section>
        </Card.Content>
      </Card>

      {folderSelected && computeConsentGranted ? (
        <p className="text-muted text-center text-sm">
          Both requirements are satisfied. The workspace opens automatically.
        </p>
      ) : (
        <p className="text-muted text-center text-sm">
          Complete both steps above to open the STXM workspace.
        </p>
      )}
    </div>
  );
}
