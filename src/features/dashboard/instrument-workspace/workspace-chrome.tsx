"use client";

import { Button, Tabs } from "@heroui/react";
import { cn } from "@heroui/styles";
import { FolderSync, RefreshCw, Settings } from "lucide-react";
import {
  DASHBOARD_WORKSPACE_TAB_LABELS,
  type DashboardWorkspaceTab,
} from "~/lib/dashboard-processing-session";

type WorkspaceChromeProps = {
  breadcrumb: string[];
  activeTab: DashboardWorkspaceTab;
  onTabChange: (tab: DashboardWorkspaceTab) => void;
  onChangeLocation: () => void;
  onReload: () => void;
  isReloading?: boolean;
  ingestionEnabled?: boolean;
};

/**
 * Top chrome: breadcrumb trail, location controls, and stxm-inspired tab row.
 */
export function WorkspaceChrome({
  breadcrumb,
  activeTab,
  onTabChange,
  onChangeLocation,
  onReload,
  isReloading = false,
  ingestionEnabled = false,
}: WorkspaceChromeProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="text-muted flex flex-wrap items-center gap-1 text-sm">
            {breadcrumb.map((segment, index) => (
              <li key={`${segment}-${index}`} className="flex items-center gap-1">
                {index > 0 ? <span aria-hidden>/</span> : null}
                <span
                  className={cn(
                    index === breadcrumb.length - 1
                      ? "text-foreground font-medium"
                      : "",
                  )}
                >
                  {segment}
                </span>
              </li>
            ))}
          </ol>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" size="sm" onPress={onChangeLocation}>
            <FolderSync className="h-3.5 w-3.5" aria-hidden />
            Change location
          </Button>
          <Button
            variant="secondary"
            size="sm"
            isDisabled={isReloading}
            onPress={onReload}
            aria-label="Reload scans from disk after adding files to the experiment folder"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Reload
          </Button>
          <Button variant="ghost" size="sm" isDisabled aria-label="Settings">
            <Settings className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => onTabChange(key as DashboardWorkspaceTab)}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="Workspace views">
            {(
              Object.entries(DASHBOARD_WORKSPACE_TAB_LABELS) as Array<
                [DashboardWorkspaceTab, string]
              >
            ).map(([tab, label]) => (
              <Tabs.Tab
                key={tab}
                id={tab}
                isDisabled={tab === "ingestion" && !ingestionEnabled}
              >
                {label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
    </div>
  );
}
