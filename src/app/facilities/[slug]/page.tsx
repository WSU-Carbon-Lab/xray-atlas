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
  ChartBarIcon,
  BuildingOfficeIcon,
  BookOpenIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { AddInstrumentButton } from "@/components/contribute";
import { InstrumentStatusChip } from "@/components/forms/instrument-status-chip";
import { InstrumentConnectorClaimSection } from "~/features/dashboard/instrument-connector-claim-section";
import { FacilityIcon } from "~/components/facilities/facility-icon";
import { FacilityWebsiteAdminCard } from "~/components/facilities/facility-website-admin-card";
import { Button, Card, Chip, Separator } from "@heroui/react";
import { cn } from "@heroui/styles";

const exploreCatalogLinkClass =
  "focus-visible:ring-accent inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:border-border hover:bg-default/80 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const exploreInstrumentLinkClass =
  "focus-visible:ring-accent inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-accent/15 hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const facilitySectionPaddingClass = "px-5 sm:px-6";

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
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
            <div className="min-w-0 flex flex-1 gap-4">
              <FacilityIcon
                name={facility.name}
                faviconUrl={facility.faviconurl}
                className="h-14 w-14 shrink-0 sm:h-16 sm:w-16"
                iconClassName="h-8 w-8 sm:h-9 sm:w-9"
              />
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
                  {facility.websiteurl ? (
                    <a
                      href={facility.websiteurl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:text-accent-dark inline-flex max-w-full items-center gap-1.5 font-medium underline-offset-2 hover:underline"
                    >
                      <LinkIcon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="truncate">Visit facility website</span>
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <FacilityWebsiteAdminCard
          facilityId={facility.id}
          facilityName={facility.name}
          websiteUrl={facility.websiteurl}
          faviconUrl={facility.faviconurl}
          onSaved={() => {
            void refetch();
          }}
        />

        <Card className="border-border bg-surface-1 overflow-hidden rounded-xl border shadow-sm">
          <nav
            aria-label="Explore related catalogs"
            className={cn(
              "border-border border-b py-5 sm:py-6",
              facilitySectionPaddingClass,
            )}
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
                        <ChartBarIcon
                          className="h-4 w-4 shrink-0 opacity-80"
                          aria-hidden
                        />
                        <span>NEXAFS: {instrument.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  <li>
                    <Link href="/browse/nexafs" className={exploreInstrumentLinkClass}>
                      <ChartBarIcon
                        className="h-4 w-4 shrink-0 opacity-80"
                        aria-hidden
                      />
                      <span>Browse NEXAFS experiments</span>
                    </Link>
                  </li>
                </ul>
              )}
              <Separator className="bg-border" />
              <ul className="flex flex-wrap gap-2">
                <li>
                  <Link href="/browse/facilities" className={exploreCatalogLinkClass}>
                    <BuildingOfficeIcon
                      className="h-4 w-4 shrink-0 opacity-70"
                      aria-hidden
                    />
                    <span>All facilities</span>
                  </Link>
                </li>
                <li>
                  <Link href="/wiki/home" className={exploreCatalogLinkClass}>
                    <BookOpenIcon
                      className="h-4 w-4 shrink-0 opacity-70"
                      aria-hidden
                    />
                    <span>NEXAFS wiki</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/wiki/platform-features"
                    className={exploreCatalogLinkClass}
                  >
                    <SparklesIcon
                      className="h-4 w-4 shrink-0 opacity-70"
                      aria-hidden
                    />
                    <span>Platform features</span>
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
          <Card.Header
            className={cn(
              "border-border flex flex-col gap-4 border-b py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3",
              facilitySectionPaddingClass,
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="text-accent bg-accent/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                aria-hidden
              >
                <BeakerIcon className="h-4 w-4 shrink-0" />
              </span>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Card.Title className="text-foreground text-lg font-semibold">
                  Instruments
                </Card.Title>
                <Chip
                  size="sm"
                  variant="soft"
                  color="default"
                  className="text-muted h-6 px-2 text-xs font-medium tabular-nums"
                  aria-label={`${facility.instruments.length} instruments`}
                >
                  {facility.instruments.length}
                </Chip>
              </div>
            </div>
            <div className="w-full shrink-0 sm:w-auto sm:max-w-sm">
              <AddInstrumentButton
                facilityId={facility.id}
                facilityName={facility.name}
                className="w-full"
                onCreated={() => {
                  void refetch();
                }}
              />
            </div>
          </Card.Header>
          <Card.Content className={cn("py-5 sm:py-6", facilitySectionPaddingClass)}>
            {facility.instruments.length === 0 ? (
              <p className="text-muted text-center text-sm">
                No instruments registered for this facility yet.
              </p>
            ) : (
              <ul className="space-y-4" aria-label="Instruments at this facility">
                {facility.instruments.map((instrument) => (
                  <li key={instrument.id} id={`instrument-${instrument.id}`}>
                    <Card
                      variant="secondary"
                      className="border-border bg-surface-2 scroll-mt-24 rounded-lg border"
                    >
                      <Card.Content className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-foreground text-base font-semibold">
                              {instrument.name}
                            </h2>
                            <InstrumentStatusChip status={instrument.status} />
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
