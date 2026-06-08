"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { ErrorState } from "@/components/feedback/error-state";
import { PageSkeleton } from "@/components/feedback/loading-state";
import {
  MapPinIcon,
  BeakerIcon,
  LinkIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  BookOpenIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { AddInstrumentButton } from "@/components/contribute";
import { InstrumentConnectorClaimSection } from "~/features/dashboard/instrument-connector-claim-section";
import { Button, Card, Chip, Separator } from "@heroui/react";

const exploreCatalogLinkClass =
  "focus-visible:ring-accent inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:border-border hover:bg-default/80 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const exploreInstrumentLinkClass =
  "focus-visible:ring-accent inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-accent/15 hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function FacilityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const facilityQuery = trpc.facilities.getBySlug.useQuery({ slug });
  const stewardsQuery = trpc.instruments.listStewardsForFacility.useQuery(
    { facilityId: facilityQuery.data?.id ?? "" },
    { enabled: Boolean(facilityQuery.data?.id) },
  );
  const { data: facility, isLoading, isError, error, refetch } = facilityQuery;
  const stewardsByInstrumentId = stewardsQuery.data ?? {};

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (isError || !facility) {
    return (
      <ErrorState
        title="Facility Not Found"
        message={
          error?.message ?? "The facility you're looking for doesn't exist."
        }
        onRetry={() => window.location.reload()}
      />
    );
  }

  const location =
    [facility.city, facility.country].filter(Boolean).join(", ") ||
    "Location unknown";

  const facilityTypeLabel = {
    SYNCHROTRON: "Synchrotron",
    FREE_ELECTRON_LASER: "Free Electron Laser",
    LAB_SOURCE: "Lab Source",
  }[facility.facilitytype];

  const statusChip = (status: string) => {
    const map = {
      active: {
        label: "Active",
        icon: CheckCircleIcon,
        color: "success" as const,
      },
      inactive: {
        label: "Inactive",
        icon: XCircleIcon,
        color: "danger" as const,
      },
      under_maintenance: {
        label: "Under Maintenance",
        icon: ClockIcon,
        color: "warning" as const,
      },
    };
    const config = map[status as keyof typeof map] ?? map.active;
    const Icon = config.icon;
    return (
      <Chip
        size="sm"
        variant="soft"
        color={config.color}
        className="h-7 gap-1.5 px-2.5 text-xs font-medium"
      >
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {config.label}
      </Chip>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Button
            type="button"
            variant="ghost"
            className="text-muted hover:text-foreground mb-4 -ms-1 inline-flex h-auto min-h-10 items-center gap-2 px-2 py-2 text-sm font-medium"
            onPress={() => router.push("/browse/facilities")}
          >
            <ArrowLeftIcon className="h-4 w-4 shrink-0" />
            <span>Back to facilities</span>
          </Button>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-3">
              <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
                {facility.name}
              </h1>
              <div className="text-muted flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="inline-flex items-center gap-2">
                  <MapPinIcon className="text-foreground/70 h-5 w-5 shrink-0" />
                  <span>{location}</span>
                </span>
                <Chip
                  size="sm"
                  variant="soft"
                  color="accent"
                  className="h-7 px-2.5 text-xs font-semibold"
                >
                  {facilityTypeLabel}
                </Chip>
              </div>
            </div>
          </div>
        </div>

        <nav
          aria-label="Explore related catalogs"
          className="border-border bg-surface/40 mt-8 rounded-xl border px-4 py-5 sm:px-5 sm:py-6"
        >
          <p className="text-muted mb-4 text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
            Explore
          </p>
          <div className="flex flex-col gap-4">
            {facility.instruments.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {facility.instruments.slice(0, 2).map((instrument) => (
                  <li key={instrument.id}>
                    <Link
                      href={`/browse/nexafs?instrument=${encodeURIComponent(instrument.id)}`}
                      className={exploreInstrumentLinkClass}
                    >
                      <ChartBarIcon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                      <span>NEXAFS: {instrument.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="flex flex-wrap gap-2">
                <li>
                  <Link href="/browse/nexafs" className={exploreInstrumentLinkClass}>
                    <ChartBarIcon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                    <span>Browse NEXAFS experiments</span>
                  </Link>
                </li>
              </ul>
            )}
            <Separator className="bg-border" />
            <ul className="flex flex-wrap gap-2">
              <li>
                <Link href="/browse/facilities" className={exploreCatalogLinkClass}>
                  <BuildingOfficeIcon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                  <span>All facilities</span>
                </Link>
              </li>
              <li>
                <Link href="/wiki/home" className={exploreCatalogLinkClass}>
                  <BookOpenIcon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                  <span>NEXAFS wiki</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/wiki/platform-features"
                  className={exploreCatalogLinkClass}
                >
                  <SparklesIcon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                  <span>Platform features</span>
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        <Card className="border-border bg-surface-1 overflow-hidden border shadow-sm">
          <Card.Header className="border-border flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <Card.Title className="text-foreground flex items-center gap-2 text-lg font-semibold">
              <BeakerIcon className="h-5 w-5 shrink-0" />
              Instruments ({facility.instruments.length})
            </Card.Title>
            <AddInstrumentButton
              facilityId={facility.id}
              facilityName={facility.name}
              onCreated={() => {
                void refetch();
              }}
            />
          </Card.Header>
          <Card.Content className="p-5 sm:p-6">
            {facility.instruments.length === 0 ? (
              <p className="text-muted text-center text-sm">
                No instruments registered for this facility yet.
              </p>
            ) : (
              <ul className="space-y-3" aria-label="Instruments at this facility">
                {facility.instruments.map((instrument) => (
                  <li key={instrument.id} id={`instrument-${instrument.id}`}>
                    <Card
                      variant="secondary"
                      className="border-border bg-surface-2/80 border scroll-mt-24"
                    >
                      <Card.Content className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-foreground text-base font-semibold">
                              {instrument.name}
                            </h2>
                            {statusChip(instrument.status)}
                          </div>
                          {instrument.link ? (
                            <a
                              href={instrument.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent hover:text-accent-dark inline-flex max-w-full items-center gap-1.5 text-sm font-medium underline-offset-2 hover:underline"
                            >
                              <LinkIcon className="h-4 w-4 shrink-0" />
                              <span className="truncate">Visit instrument page</span>
                            </a>
                          ) : null}
                          <InstrumentConnectorClaimSection
                            facilityId={facility.id}
                            facilityName={facility.name}
                            instrumentId={instrument.id}
                            instrumentName={instrument.name}
                            stewards={stewardsByInstrumentId[instrument.id] ?? []}
                          />
                        </div>
                      </Card.Content>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
