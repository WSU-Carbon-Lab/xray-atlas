"use client";

import { use } from "react";
import { trpc } from "~/trpc/client";
import { ErrorState } from "@/components/feedback/error-state";
import { PageSkeleton } from "@/components/feedback/loading-state";
import Link from "next/link";
import {
  MapPinIcon,
  BeakerIcon,
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { AddInstrumentButton } from "~/app/components/AddEntityButtons";

export default function FacilityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const facilityQuery = trpc.facilities.getById.useQuery({ id });
  const { data: facility, isLoading, isError, error, refetch } = facilityQuery;

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

  const statusBadge = (status: string) => {
    const statusConfig = {
      active: {
        label: "Active",
        icon: CheckCircleIcon,
        className:
          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      },
      inactive: {
        label: "Inactive",
        icon: XCircleIcon,
        className:
          "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      },
      under_maintenance: {
        label: "Under Maintenance",
        icon: ClockIcon,
        className:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
      >
        <Icon className="h-3.5 w-3.5" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/browse/facilities"
            className="hover:text-accent dark:text-accent-light dark:hover:text-accent dark:text-accent-light mb-4 inline-flex items-center text-sm text-gray-600 dark:text-gray-400"
          >
            ← Back to Facilities
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold text-gray-900 dark:text-gray-100">
                {facility.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <MapPinIcon className="h-5 w-5" />
                  <span>{location}</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  {facilityTypeLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Instruments Section */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                <BeakerIcon className="h-5 w-5" />
                Instruments ({facility.instruments.length})
              </h2>
              <AddInstrumentButton
                facilityId={facility.id}
                facilityName={facility.name}
                onCreated={() => {
                  void refetch();
                }}
              />
            </div>
          </div>

          <div className="p-6">
            {facility.instruments.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400">
                No instruments registered for this facility.
              </p>
            ) : (
              <div className="space-y-3">
                {facility.instruments.map((instrument) => (
                  <div
                    key={instrument.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {instrument.name}
                        </h3>
                        {statusBadge(instrument.status)}
                      </div>
                      {instrument.link && (
                        <a
                          href={instrument.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent dark:text-accent-light mt-2 inline-flex items-center gap-1.5 text-sm hover:underline"
                        >
                          <LinkIcon className="h-4 w-4" />
                          Visit Instrument Page
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
