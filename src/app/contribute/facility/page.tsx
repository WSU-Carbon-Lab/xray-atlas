"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DefaultButton as Button } from "@/components/ui/button";
import {
  ContributionAgreementModal,
  ContributionFileDropOverlay,
} from "@/components/contribute";
import type { ContributionFileDropOverlayFileKind } from "@/components/contribute";
import { trpc } from "~/trpc/client";
import {
  BuildingOfficeIcon,
  PlusIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { Key } from "@heroui/react";
import {
  ComboBox,
  Description,
  Fieldset,
  Input,
  Label as HeroLabel,
  ListBox,
} from "@heroui/react";
import { parseFacilityJsonFile } from "~/app/contribute/facility/utils/parse-facility-json";
import { parseFacilityCsvFile } from "~/app/contribute/facility/utils/parse-facility-csv";

const formInputClass =
  "w-full rounded-xl border border-zinc-300 bg-zinc-50/80 px-4 py-2.5 text-zinc-900 placeholder:text-zinc-500 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:ring-offset-0 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder:text-zinc-400";
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
  onCompleted?: (payload: {
    facilityId: string;
    instrumentId?: string;
  }) => void;
  onClose?: () => void;
};

export default function FacilityContributePage({
  variant = "page",
  onCompleted,
  onClose,
}: FacilityContributePageProps = {}) {
  const router = useRouter();
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const isModal = variant === "modal";

  const handleAgreementAccepted = () => {
    setShowAgreementModal(false);
  };
  const [facilityData, setFacilityData] = useState({
    name: "",
    city: "",
    country: "",
    facilityType: "LAB_SOURCE" as
      | "SYNCHROTRON"
      | "FREE_ELECTRON_LASER"
      | "LAB_SOURCE",
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
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFileType, setDraggedFileType] =
    useState<ContributionFileDropOverlayFileKind | null>(null);
  const [draggedFileName, setDraggedFileName] = useState<string | null>(null);
  const dragCounterRef = useRef(0);

  const handleJsonDropped = useCallback(async (file: File) => {
    try {
      const parsed = await parseFacilityJsonFile(file);
      setSubmitStatus({ type: null, message: "" });
      setFacilityData((prev) => ({
        ...prev,
        name: parsed.name || prev.name,
        city: parsed.city ?? prev.city,
        country: parsed.country ?? prev.country,
        facilityType: parsed.facilityType,
      }));
      setInstruments(
        parsed.instruments.length > 0
          ? parsed.instruments.map((inst) => ({
              name: inst.name,
              link: inst.link ?? "",
              status: inst.status,
            }))
          : [],
      );
    } catch (err) {
      setSubmitStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to parse JSON file",
      });
    }
  }, []);

  const handleCsvDropped = useCallback(async (file: File) => {
    try {
      const parsed = await parseFacilityCsvFile(file);
      setSubmitStatus({ type: null, message: "" });
      setFacilityData((prev) => ({
        ...prev,
        name: parsed.name || prev.name,
        city: parsed.city ?? prev.city,
        country: parsed.country ?? prev.country,
        facilityType: parsed.facilityType,
      }));
      setInstruments(
        parsed.instruments.length > 0
          ? parsed.instruments.map((inst) => ({
              name: inst.name,
              link: inst.link ?? "",
              status: inst.status,
            }))
          : [],
      );
    } catch (err) {
      setSubmitStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to parse CSV file",
      });
    }
  }, []);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current++;
      if (e.dataTransfer?.types.includes("Files")) {
        const items = Array.from(e.dataTransfer?.items ?? []);
        const fileTypes = items
          .filter((item) => item.kind === "file")
          .map((item) => {
            const f = item.getAsFile();
            const name = f?.name.toLowerCase() ?? "";
            if (name.endsWith(".json")) return "json" as const;
            if (name.endsWith(".csv")) return "csv" as const;
            return null;
          })
          .filter((t): t is "csv" | "json" => t !== null);
        if (fileTypes.length > 0) {
          setIsDragging(true);
          const unique = Array.from(new Set(fileTypes));
          setDraggedFileType(unique.length === 1 ? unique[0]! : "mixed");
          const first = items.find((item) => item.kind === "file")?.getAsFile();
          if (first?.name) setDraggedFileName(first.name);
        }
      }
    };
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsDragging(false);
        setDraggedFileType(null);
        setDraggedFileName(null);
      }
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);
      setDraggedFileType(null);
      setDraggedFileName(null);
      const files = Array.from(e.dataTransfer?.files ?? []).filter(
        (file) =>
          file.name.toLowerCase().endsWith(".json") ||
          file.name.toLowerCase().endsWith(".csv"),
      );
      const first = files[0];
      if (!first) return;
      if (first.name.toLowerCase().endsWith(".json")) {
        void handleJsonDropped(first);
      } else {
        void handleCsvDropped(first);
      }
    };
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [handleJsonDropped, handleCsvDropped]);

  const facilitiesListQuery = trpc.facilities.list.useQuery({
    limit: 100,
    offset: 0,
  });
  const facilitiesList = facilitiesListQuery.data?.facilities ?? [];
  const [facilityNameSelectedKey, setFacilityNameSelectedKey] =
    useState<Key | null>(null);

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
      prev.map((inst, i) => (i === index ? { ...inst, [field]: value } : inst)),
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
        country: facilityData.country.trim()
          ? facilityData.country.trim()
          : null,
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
        message:
          derivedMessage ?? "Failed to create facility. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="mb-4 text-4xl font-bold text-slate-900 dark:text-slate-100">
          Contribute Facility
        </h1>
        <p className="mb-8 text-slate-600 dark:text-slate-400">
          Please sign in to contribute facilities to the X-ray Atlas database.
        </p>
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
      <ContributionFileDropOverlay
        isDragging={isDragging}
        fileKind={draggedFileType ?? "mixed"}
        fileName={draggedFileName}
      />
      <div className={`${isModal ? "" : "container mx-auto"} px-4 py-8`}>
        <div className="mx-auto max-w-4xl">
          {!isModal && (
            <div className="mb-6">
              <Link
                href="/contribute"
                className="hover:text-accent dark:hover:text-accent-light text-sm text-slate-600 dark:text-slate-400"
              >
                Back to contribution type selection
              </Link>
            </div>
          )}
          <h1 className="mb-8 text-4xl font-bold text-slate-900 dark:text-slate-100">
            Contribute Facility & Instruments
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Fieldset className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
              <Fieldset.Legend className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                <BuildingOfficeIcon className="h-6 w-6" />
                Facility Information
              </Fieldset.Legend>
              <Fieldset.Group className="space-y-4">
                {existingFacility && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 dark:border-amber-900/50 dark:bg-amber-950/40">
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div className="flex-1">
                        <h3 className="mb-1 font-semibold text-amber-800 dark:text-amber-300">
                          Facility Already Exists
                        </h3>
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                          A facility with this name and location already exists
                          in the database.
                        </p>
                        <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                          Existing instruments:{" "}
                          {existingFacility.instruments.length > 0
                            ? existingFacility.instruments
                                .map((inst) => inst.name)
                                .join(", ")
                            : "None"}
                        </p>
                        <Link
                          href={`/facilities/${existingFacility.id}`}
                          className="mt-2 inline-block text-sm font-medium text-amber-800 underline dark:text-amber-300"
                        >
                          View existing facility
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                <ComboBox
                  fullWidth
                  allowsCustomValue
                  isRequired
                  aria-label="Facility Name"
                  selectedKey={facilityNameSelectedKey}
                  onSelectionChange={(key) => {
                    setFacilityNameSelectedKey(key);
                    if (key != null && typeof key === "string") {
                      const f = facilitiesList.find((fac) => fac.id === key);
                      if (f) {
                        setFacilityData((prev) => ({
                          ...prev,
                          name: f.name,
                          city: f.city ?? "",
                          country: f.country ?? "",
                          facilityType: f.facilitytype,
                        }));
                      }
                    }
                  }}
                  inputValue={facilityData.name}
                  onInputChange={(value) => {
                    setFacilityData((prev) => ({ ...prev, name: value }));
                    setFacilityNameSelectedKey(null);
                  }}
                  items={facilitiesList}
                  className="w-full"
                >
                  <HeroLabel className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Facility Name{" "}
                    <span className="text-red-500" aria-hidden>
                      *
                    </span>
                  </HeroLabel>
                  <ComboBox.InputGroup className={formInputClass}>
                    <Input
                      placeholder="e.g., Advanced Light Source"
                      className="bg-transparent! shadow-none!"
                    />
                    <ComboBox.Trigger />
                  </ComboBox.InputGroup>
                  <Description className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    Select an existing facility from the list or type a new name
                    to add one.
                  </Description>
                  <ComboBox.Popover>
                    <ListBox items={facilitiesList}>
                      {(facility: (typeof facilitiesList)[number]) => (
                        <ListBox.Item
                          id={facility.id}
                          textValue={facility.name}
                          key={facility.id}
                        >
                          {facility.city || facility.country
                            ? `${facility.name} (${[facility.city, facility.country].filter(Boolean).join(", ")})`
                            : facility.name}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      )}
                    </ListBox>
                  </ComboBox.Popover>
                </ComboBox>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <HeroLabel
                      htmlFor="city"
                      className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      City
                    </HeroLabel>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={facilityData.city}
                      onChange={handleInputChange}
                      className={formInputClass}
                      placeholder="e.g., Berkeley"
                    />
                  </div>
                  <div>
                    <HeroLabel
                      htmlFor="country"
                      className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Country
                    </HeroLabel>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      value={facilityData.country}
                      onChange={handleInputChange}
                      className={formInputClass}
                      placeholder="e.g., United States"
                    />
                  </div>
                </div>

                <div>
                  <HeroLabel
                    htmlFor="facilityType"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Facility Type{" "}
                    <span className="text-red-500" aria-hidden>
                      *
                    </span>
                  </HeroLabel>
                  <select
                    id="facilityType"
                    name="facilityType"
                    required
                    value={facilityData.facilityType}
                    onChange={handleInputChange}
                    className={formInputClass}
                  >
                    <option value="LAB_SOURCE">Lab Source</option>
                    <option value="SYNCHROTRON">Synchrotron</option>
                    <option value="FREE_ELECTRON_LASER">
                      Free Electron Laser
                    </option>
                  </select>
                </div>
              </Fieldset.Group>
            </Fieldset>

            <Fieldset className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
              <div className="flex items-center justify-between">
                <Fieldset.Legend className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Instruments
                </Fieldset.Legend>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addInstrument}
                  className="flex items-center gap-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Instrument
                </Button>
              </div>

              {instruments.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No instruments added yet. Click &quot;Add Instrument&quot; to
                  add one.
                </p>
              ) : (
                <div className="space-y-4">
                  {instruments.map((instrument, index) => (
                    <InstrumentForm
                      key={index}
                      instrument={instrument}
                      facilityId={existingFacility?.id}
                      onChange={(field, value) =>
                        updateInstrument(index, field, value)
                      }
                      onRemove={() => removeInstrument(index)}
                    />
                  ))}
                </div>
              )}
            </Fieldset>

            <div className="flex justify-end border-t border-slate-200 pt-6 dark:border-slate-700">
              <Button
                type="submit"
                isDisabled={isSubmitting || !!existingFacility}
                className="flex items-center gap-2"
              >
                {isSubmitting ? "Creating..." : "Create Facility"}
              </Button>
            </div>

            {submitStatus.type && (
              <div
                className={`rounded-xl border p-4 ${
                  submitStatus.type === "success"
                    ? "border-emerald-200 bg-emerald-50/90 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-red-200 bg-red-50/90 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
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
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium text-slate-900 dark:text-slate-100">
          Instrument {instrument.name.trim() ? instrument.name : "New"}
        </h3>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
          aria-label="Remove instrument"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <HeroLabel className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            Instrument Name{" "}
            <span className="text-red-500" aria-hidden>
              *
            </span>
          </HeroLabel>
          <div className="relative">
            <input
              type="text"
              required
              value={instrument.name}
              onChange={(e) => onChange("name", e.target.value)}
              className={`${formInputClass} ${
                instrumentExists
                  ? "border-amber-300 bg-amber-50/90 dark:border-amber-700 dark:bg-amber-950/40"
                  : ""
              }`}
              placeholder="e.g., Beamline 7.3.3"
            />
            {instrumentExists && instrument.name.length > 0 && (
              <div className="mt-2 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <span>This instrument already exists at this facility</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <HeroLabel className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Instrument Link (Optional)
          </HeroLabel>
          <input
            type="url"
            value={instrument.link}
            onChange={(e) => onChange("link", e.target.value)}
            className={formInputClass}
            placeholder="https://..."
          />
        </div>

        <div>
          <HeroLabel className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Status
          </HeroLabel>
          <select
            value={instrument.status}
            onChange={(e) =>
              onChange("status", e.target.value as InstrumentFormData["status"])
            }
            className={formInputClass}
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
