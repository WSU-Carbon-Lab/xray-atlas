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
import { FieldTooltip } from "~/components/ui/field-tooltip";
import {
  BuildingOfficeIcon,
  PlusIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { Key } from "@heroui/react";
import {
  ComboBox,
  Breadcrumbs,
  Description,
  Form,
  Input,
  InputGroup,
  Label as HeroLabel,
  ListBox,
  Select,
  TextField,
} from "@heroui/react";
import { parseFacilityJsonFile } from "~/app/contribute/facility/utils/parse-facility-json";
import { parseFacilityCsvFile } from "~/app/contribute/facility/utils/parse-facility-csv";

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
        <h1 className="text-foreground mb-4 text-4xl font-bold">
          Contribute Facility
        </h1>
        <p className="text-muted mb-8">
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
              <Breadcrumbs className="text-sm font-medium">
                <Breadcrumbs.Item href="/contribute">
                  Contributions
                </Breadcrumbs.Item>
                <Breadcrumbs.Item>Facility</Breadcrumbs.Item>
              </Breadcrumbs>
            </div>
          )}
          <h1 className="text-foreground mb-8 text-4xl font-bold">
            Contribute Facility & Instruments
          </h1>

          <Form onSubmit={handleSubmit} className="space-y-6">
            <section className="space-y-4">
              <h2 className="text-foreground flex items-center gap-2 text-xl font-semibold">
                <BuildingOfficeIcon className="h-6 w-6" />
                Facility Information
              </h2>
              <div className="space-y-4">
                {existingFacility && (
                  <div className="border-warning/50 bg-warning/10 rounded-xl border p-4">
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="text-warning-dark h-5 w-5 shrink-0" />
                      <div className="flex-1">
                        <h3 className="text-foreground mb-1 font-semibold">
                          Facility Already Exists
                        </h3>
                        <p className="text-muted text-sm">
                          A facility with this name and location already exists
                          in the database.
                        </p>
                        <p className="text-muted mt-2 text-sm">
                          Existing instruments:{" "}
                          {existingFacility.instruments.length > 0
                            ? existingFacility.instruments
                                .map((inst) => inst.name)
                                .join(", ")
                            : "None"}
                        </p>
                        <Link
                          href={`/facilities/${existingFacility.id}`}
                          className="text-foreground mt-2 inline-block text-sm font-medium underline"
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
                  <HeroLabel className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
                    Facility Name{" "}
                    <span className="text-danger" aria-hidden>
                      *
                    </span>
                    <FieldTooltip description="The official name of the facility" />
                  </HeroLabel>
                  <ComboBox.InputGroup className="w-full">
                    <Input
                      placeholder="e.g., Advanced Light Source"
                      className="bg-field-background! shadow-none!"
                    />
                    <ComboBox.Trigger />
                  </ComboBox.InputGroup>
                  <Description className="text-muted mt-1.5 text-xs">
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
                  <TextField
                    name="city"
                    value={facilityData.city}
                    onChange={(value) =>
                      setFacilityData((prev) => ({ ...prev, city: value }))
                    }
                    variant="secondary"
                    fullWidth
                  >
                    <HeroLabel className="text-foreground mb-1.5 block text-sm font-medium">
                      City
                      <FieldTooltip description="Facility city or locality" />
                    </HeroLabel>
                    <InputGroup variant="secondary" fullWidth>
                      <InputGroup.Input placeholder="e.g., Berkeley" />
                    </InputGroup>
                  </TextField>
                  <TextField
                    name="country"
                    value={facilityData.country}
                    onChange={(value) =>
                      setFacilityData((prev) => ({ ...prev, country: value }))
                    }
                    variant="secondary"
                    fullWidth
                  >
                    <HeroLabel className="text-foreground mb-1.5 block text-sm font-medium">
                      Country
                      <FieldTooltip description="Facility country" />
                    </HeroLabel>
                    <InputGroup variant="secondary" fullWidth>
                      <InputGroup.Input placeholder="e.g., United States" />
                    </InputGroup>
                  </TextField>
                </div>

                <div>
                  <HeroLabel className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
                    Facility Type{" "}
                    <span className="text-danger" aria-hidden>
                      *
                    </span>
                    <span className="sr-only">(required)</span>
                    <FieldTooltip description="Select the facility type" />
                  </HeroLabel>
                  <Select
                    className="w-full"
                    isRequired
                    value={facilityData.facilityType}
                    onChange={(value) => {
                      if (value == null) return;
                      const next = String(
                        Array.isArray(value) ? value[0] : value,
                      ) as "LAB_SOURCE" | "SYNCHROTRON" | "FREE_ELECTRON_LASER";
                      setFacilityData((prev) => ({
                        ...prev,
                        facilityType: next,
                      }));
                    }}
                  >
                    <Select.Trigger className="min-h-[44px]">
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox aria-label="Facility types" className="w-full">
                        <ListBox.Item key="LAB_SOURCE" textValue="Lab Source">
                          Lab Source
                        </ListBox.Item>
                        <ListBox.Item key="SYNCHROTRON" textValue="Synchrotron">
                          Synchrotron
                        </ListBox.Item>
                        <ListBox.Item
                          key="FREE_ELECTRON_LASER"
                          textValue="Free Electron Laser"
                        >
                          Free Electron Laser
                        </ListBox.Item>
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-foreground text-xl font-semibold">
                  Instruments
                </h2>
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
                <p className="text-muted text-sm">
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
            </section>

            <div className="border-border flex justify-end border-t pt-6">
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
                className={
                  submitStatus.type === "success"
                    ? "border-success/50 bg-success/10 text-foreground rounded-xl border p-4"
                    : "border-error/50 bg-error/10 text-foreground rounded-xl border p-4"
                }
              >
                {submitStatus.message}
              </div>
            )}
          </Form>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground font-medium">
          Instrument {instrument.name.trim() ? instrument.name : "New"}
        </h3>
        <button
          type="button"
          onClick={onRemove}
          className="text-danger hover:opacity-90"
          aria-label="Remove instrument"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <TextField
            name={`instrument-name-${instrument.name}`}
            value={instrument.name}
            onChange={(value) => onChange("name", value)}
            isRequired
            variant="secondary"
            fullWidth
          >
            <HeroLabel className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
              Instrument Name{" "}
              <span className="text-danger" aria-hidden>
                *
              </span>
              <span className="sr-only">(required)</span>
              <FieldTooltip description="Instrument commonly used name or designation" />
            </HeroLabel>
            <InputGroup
              variant="secondary"
              fullWidth
              className={
                instrumentExists ? "border-warning/50 bg-warning/10" : undefined
              }
            >
              <InputGroup.Input placeholder="e.g., Beamline 7.3.3" />
            </InputGroup>
          </TextField>
          {instrumentExists && instrument.name.length > 0 && (
            <div className="text-muted mt-2 flex items-center gap-2 text-sm">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <span>This instrument already exists at this facility</span>
            </div>
          )}
        </div>

        <TextField
          name={`instrument-link-${instrument.link}`}
          value={instrument.link}
          onChange={(value) => onChange("link", value)}
          variant="secondary"
          fullWidth
        >
          <HeroLabel className="text-foreground mb-1.5 block text-sm font-medium">
            Instrument Link (Optional)
            <FieldTooltip description="Optional URL to the instrument documentation or facility page" />
          </HeroLabel>
          <InputGroup variant="secondary" fullWidth>
            <InputGroup.Input type="url" placeholder="https://..." />
          </InputGroup>
        </TextField>

        <Select
          className="w-full"
          value={instrument.status}
          onChange={(value) => {
            if (value == null) return;
            const next = String(
              Array.isArray(value) ? value[0] : value,
            ) as InstrumentFormData["status"];
            onChange("status", next);
          }}
        >
          <HeroLabel className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
            Status
            <FieldTooltip description="Instrument operating status" />
          </HeroLabel>
          <Select.Trigger className="min-h-[44px]">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox aria-label="Instrument status" className="w-full">
              <ListBox.Item key="active" textValue="Active" className="text-sm">
                Active
              </ListBox.Item>
              <ListBox.Item
                key="inactive"
                textValue="Inactive"
                className="text-sm"
              >
                Inactive
              </ListBox.Item>
              <ListBox.Item
                key="under_maintenance"
                textValue="Under Maintenance"
                className="text-sm"
              >
                Under Maintenance
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </div>
    </div>
  );
}
