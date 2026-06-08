import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Spinner } from "@heroui/react";
import {
  isDashboardWorkspaceAccessible,
  resolveDashboardConnector,
} from "~/features/dashboard/connectors/registry";
import { InstrumentWorkspacePage } from "./instrument-workspace-page";

type InstrumentSlugPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: InstrumentSlugPageProps) {
  const { slug } = await params;
  const connector = resolveDashboardConnector(slug);
  if (!connector || !isDashboardWorkspaceAccessible(slug)) {
    return { title: "Instrument workspace" };
  }
  return { title: connector.label };
}

function WorkspaceFallback() {
  return (
    <div className="flex justify-center py-16">
      <Spinner size="lg" />
    </div>
  );
}

/**
 * Dynamic instrument workspace route resolved through the dashboard connector registry.
 */
export default async function InstrumentSlugPage({ params }: InstrumentSlugPageProps) {
  const { slug } = await params;
  const connector = resolveDashboardConnector(slug);
  if (!connector || !isDashboardWorkspaceAccessible(slug)) {
    notFound();
  }

  return (
    <Suspense fallback={<WorkspaceFallback />}>
      <InstrumentWorkspacePage slug={slug} />
    </Suspense>
  );
}
