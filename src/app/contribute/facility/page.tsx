"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DefaultButton as Button } from "~/app/components/Button";
import { ContributionAgreementModal } from "~/app/components/ContributionAgreementModal";
import { trpc } from "~/trpc/client";
import {
  BuildingOfficeIcon,
  PlusIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type FacilityCreateResult = RouterOutputs["facilities"]["create"];

interface InstrumentFormData {
  name: string;
  link: string;
  status: "active" | "inactive" | "under_maintenance";
}

type FacilityContributePageProps = {
  variant?: "page" | "modal";
  onCompleted?: (payload: { facilityId: string; instrumentId?: string }) => void;
  onClose?: () => void;
};


export default function FacilityContributePage({
  variant = "page",
  onCompleted,
  onClose,
}: FacilityContributePageProps = {}) {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const isModal = variant === "modal";

  // Check if user has agreed to the contribution agreement
  const { data: agreementStatus, isLoading: isLoadingAgreement } =
    trpc.users.getContributionAgreementStatus.useQuery(undefined, {
      enabled: isSignedIn ?? false,
    });

  // Show modal if user hasn't agreed yet
  useEffect(() => {
    if (isSignedIn && !isLoadingAgreement && !agreementStatus?.accepted) {
      setShowAgreementModal(true);
    }
  }, [isSignedIn, isLoadingAgreement, agreementStatus?.accepted]);

  const handleAgreementAccepted = () => {
    setShowAgreementModal(false);
  };
  const [facilityData, setFacilityData] = useState({
    name: "",
    city: "",
    country: "",
    facilityType: "LAB_SOURCE" as "SYNCHROTRON" | "FREE_ELECTRON_LASER" | "LAB_SOURCE",
  });
  const [instruments, setInstruments] = useState<InstrumentFormData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [existingFacility, setExistingFacility] = useState<{
    id: string;
    name: string;
    city: string | null;
    country: string | null;
    instruments: Array<{ id: string; name: string }>;
  } | null>(null);

  // Check for existing facility
  const checkFacility = trpc.facilities.checkExists.useQuery(
    {
      name: facilityData.name,
      city: facilityData.city.trim() ? facilityData.city.trim() : null,
      country: facilityData.country.trim() ? facilityData.country.trim() : null,
    },
    {
      enabled: facilityData.name.length > 0,
    },
  );

  useEffect(() => {
    const facility = checkFacility.data?.facility;
    if (checkFacility.data?.exists && facility) {
      setExistingFacility(facility);
      // Auto-fill form with existing facility data
      setFacilityData((prev) => ({
        ...prev,
        name: facility.name,
        city: facility.city ?? "",
        country: facility.country ?? "",
        facilityType: facility.facilitytype,
      }));
    } else {
      setExistingFacility(null);
    }
  }, [checkFacility.data]);

  const createFacility = trpc.facilities.create.useMutation();

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFacilityData((prev) => ({ ...prev, [name]: value }));
  };

  const addInstrument = () => {
    setInstruments((prev) => [
      ...prev,
      {
        name: "",
        link: "",
        status: "active",
      },
    ]);
  };

  const removeInstrument = (index: number) => {
    setInstruments((prev) => prev.filter((_, i) => i !== index));
  };

  const updateInstrument = (
    index: number,
    field: keyof InstrumentFormData,
    value: InstrumentFormData[keyof InstrumentFormData],
  ) => {
    setInstruments((prev) =>
      prev.map((inst, i) =>
        i === index ? { ...inst, [field]: value } : inst,
      ),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      setSubmitStatus({
        type: "error",
        message: "Please sign in to contribute facilities.",
      });
      return;
    }

    if (existingFacility) {
      setSubmitStatus({
        type: "error",
        message:
          "This facility already exists. Please add instruments to the existing facility instead.",
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      const result: FacilityCreateResult = await createFacility.mutateAsync({
        name: facilityData.name,
        city: facilityData.city.trim() ? facilityData.city.trim() : null,
        country: facilityData.country.trim() ? facilityData.country.trim() : null,
        facilityType: facilityData.facilityType,
        instruments: instruments.filter((inst) => inst.name.trim().length > 0),
      });

      setSubmitStatus({
        type: "success",
        message: `Facility "${result.name}" created successfully!`,
      });

      // Type guard to safely access instruments
      const resultWithInstruments = result as FacilityCreateResult & {
        instruments?: Array<{ id: string; name: string }>;
      };
      const firstInstrumentId =
        resultWithInstruments.instruments &&
        Array.isArray(resultWithInstruments.instruments) &&
        resultWithInstruments.instruments.length > 0
          ? resultWithInstruments.instruments[0]?.id
          : undefined;

      onCompleted?.({ facilityId: result.id, instrumentId: firstInstrumentId });

      if (isModal) {
        onClose?.();
      } else {
        // Redirect to facility detail page after a delay
        setTimeout(() => {
          router.push(`/facilities/${result.id}`);
        }, 2000);
      }
    } catch (error: unknown) {
      console.error("Error creating facility:", error);
      const derivedMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null
            ? (error as { data?: { message?: string } }).data?.message
            : null;
      setSubmitStatus({
        type: "error",
        message: derivedMessage ?? "Failed to create facility. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-gray-100">
          Contribute Facility
        </h1>
        <p className="mb-8 text-gray-600 dark:text-gray-400">
          Please sign in to contribute facilities to the X-ray Atlas database.
        </p>
      </div>
    );
  }

  if (isLoadingAgreement) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-wsu-crimson mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <ContributionAgreementModal
        isOpen={showAgreementModal}
        onClose={() => {
          if (isModal) {
            onClose?.();
          } else {
            router.push("/contribute");
          }
        }}
        onAgree={handleAgreementAccepted}
      />
      <div className={`${isModal ? "" : "container mx-auto"} px-4 py-8`}>
        <div className="mx-auto max-w-4xl">
          {!isModal && (
            <div className="mb-6">
              <Link
                href="/contribute"
                className="text-sm text-gray-600 hover:text-wsu-crimson dark:text-gray-400 dark:hover:text-wsu-crimson"
              >
                ← Back to contribution type selection
              </Link>
            </div>
          )}
        <h1 className="mb-8 text-4xl font-bold text-gray-900 dark:text-gray-100">
          Contribute Facility & Instruments
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Facility Information */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
              <BuildingOfficeIcon className="h-6 w-6" />
              Facility Information
            </h2>

            <div className="space-y-4">
              {/* Existing Facility Warning */}
              {existingFacility && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
                    <div className="flex-1">
                      <h3 className="mb-1 font-semibold text-yellow-800 dark:text-yellow-300">
                        Facility Already Exists
                      </h3>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        A facility with this name and location already exists in the
                        database.
                      </p>
                      <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                        Existing instruments:{" "}
                        {existingFacility.instruments.length > 0
                          ? existingFacility.instruments.map((inst) => inst.name).join(", ")
                          : "None"}
                      </p>
                      <Link
                        href={`/facilities/${existingFacility.id}`}
                        className="mt-2 inline-block text-sm font-medium text-yellow-800 underline dark:text-yellow-300"
                      >
                        View existing facility →
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Facility Name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Facility Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={facilityData.name}
                  onChange={handleInputChange}
                  className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="e.g., Advanced Light Source"
                />
              </div>

              {/* City and Country */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="city"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={facilityData.city}
                    onChange={handleInputChange}
                    className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="e.g., Berkeley"
                  />
                </div>
                <div>
                  <label
                    htmlFor="country"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Country
                  </label>
                  <input
                    type="text"
                    id="country"
                    name="country"
                    value={facilityData.country}
                    onChange={handleInputChange}
                    className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="e.g., United States"
                  />
                </div>
              </div>

              {/* Facility Type */}
              <div>
                <label
                  htmlFor="facilityType"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Facility Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="facilityType"
                  name="facilityType"
                  required
                  value={facilityData.facilityType}
                  onChange={handleInputChange}
                  className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="LAB_SOURCE">Lab Source</option>
                  <option value="SYNCHROTRON">Synchrotron</option>
                  <option value="FREE_ELECTRON_LASER">Free Electron Laser</option>
                </select>
              </div>
            </div>
          </div>

          {/* Instruments */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Instruments
              </h2>
              <Button
                type="button"
                variant="bordered"
                onClick={addInstrument}
                className="flex items-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Add Instrument
              </Button>
            </div>

            {instruments.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No instruments added yet. Click &quot;Add Instrument&quot; to add one.
              </p>
            ) : (
              <div className="space-y-4">
                {instruments.map((instrument, index) => (
                  <InstrumentForm
                    key={index}
                    instrument={instrument}
                    facilityId={existingFacility?.id}
                    onChange={(field, value) => updateInstrument(index, field, value)}
                    onRemove={() => removeInstrument(index)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end border-t border-gray-200 pt-6 dark:border-gray-700">
            <Button
              type="submit"
              disabled={isSubmitting || !!existingFacility}
              className="flex items-center gap-2"
            >
              {isSubmitting ? "Creating..." : "Create Facility"}
            </Button>
          </div>

          {/* Status Messages */}
          {submitStatus.type && (
            <div
              className={`rounded-lg p-4 ${
                submitStatus.type === "success"
                  ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
              }`}
            >
              {submitStatus.message}
            </div>
          )}
        </form>
      </div>
    </div>
    </>
  );
}

function InstrumentForm({
  instrument,
  facilityId,
  onChange,
  onRemove,
}: {
  instrument: InstrumentFormData;
  facilityId?: string;
  onChange: (
    field: keyof InstrumentFormData,
    value: InstrumentFormData[keyof InstrumentFormData],
  ) => void;
  onRemove: () => void;
}) {
  const { data: checkData } = trpc.instruments.checkExists.useQuery(
    {
      facilityId: facilityId ?? "",
      name: instrument.name,
    },
    {
      enabled: !!facilityId && instrument.name.length > 0,
    },
  );

  const instrumentExists = checkData?.exists ?? false;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">
          Instrument {instrument.name.trim() ? instrument.name : "New"}
        </h3>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Instrument Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={instrument.name}
              onChange={(e) => onChange("name", e.target.value)}
              className={`focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded-lg border px-4 py-2 text-gray-900 focus:ring-2 focus:outline-none dark:bg-gray-800 dark:text-gray-100 ${
                instrumentExists
                  ? "border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20"
                  : "border-gray-300 bg-white dark:border-gray-600"
              }`}
              placeholder="e.g., Beamline 7.3.3"
            />
            {instrumentExists && instrument.name.length > 0 && (
              <div className="mt-2 flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <span>This instrument already exists at this facility</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Instrument Link (Optional)
          </label>
          <input
            type="url"
            value={instrument.link}
            onChange={(e) => onChange("link", e.target.value)}
            className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Status
          </label>
          <select
            value={instrument.status}
            onChange={(e) =>
              onChange("status", e.target.value as InstrumentFormData["status"])
            }
            className="focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="under_maintenance">Under Maintenance</option>
          </select>
        </div>
      </div>
    </div>
  );
}
