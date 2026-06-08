"use client";

import { useEffect, useState, type ComponentType } from "react";
import { Spinner } from "@heroui/react";
import { resolveDashboardConnector } from "~/features/dashboard/connectors/registry";

type InstrumentWorkspacePageProps = {
  slug: string;
};

/**
 * Client boundary that lazy-loads the registered workspace component for `slug`.
 */
export function InstrumentWorkspacePage({ slug }: InstrumentWorkspacePageProps) {
  const [Workspace, setWorkspace] = useState<ComponentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    const connector = resolveDashboardConnector(slug);
    if (!connector) {
      return;
    }
    void connector.loadWorkspace().then((module) => {
      if (!cancelled) {
        setWorkspace(() => module.default);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!Workspace) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return <Workspace />;
}
