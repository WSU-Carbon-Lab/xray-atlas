"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ContributionAgreementModal,
  ContributionFileDropOverlay,
} from "@/components/contribute";
import type { ContributionFileDropOverlayFileKind } from "@/components/contribute";
import { trpc } from "~/trpc/client";
import {
  FacilityIdentitySection,
  NewInstrumentsAccordion,
  RegisteredInstrumentsAccordion,
  type FacilityFormState,
  type InstrumentFormData,
} from "~/components/forms";
import { BuildingOfficeIcon, PlusIcon, WrenchScrewdriverIcon } from "@heroicons/react/24/outline";
import type { Key } from "@heroui/react";
import { Breadcrumbs, Button, Card, Form, Separator, Tabs } from "@heroui/react";
import { parseFacilityJsonFile } from "~/app/contribute/facility/utils/parse-facility-json";
import { parseFacilityCsvFile } from "~/app/contribute/facility/utils/parse-facility-csv";

import { skipToken } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type FacilityCreateResult = RouterOutputs["facilities"]["create"];

type FacilityContributePageProps = {
  variant?: "page" | "modal";
  onCompleted?: (payload: {
    facilityId: string;
    instrumentId?: string;
  }) => void;
  onClose?: () => void;
};

type ContributeStep = "facility" | "instruments";

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
  const [facilityData, setFacilityData] = useState<FacilityFormState>({
    name: "",
    city: "",
    country: "",
    facilityType: "LAB_SOURCE",
  });
  const [instruments, setInstruments] = useState<InstrumentFormData[]>([]);
  const [contributeStep, setContributeStep] =
    useState<ContributeStep>("facility");
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
  const facilitiesList = useMemo(
    () => facilitiesListQuery.data?.facilities ?? [],
    [facilitiesListQuery.data?.facilities],
  );
  const [facilityNameSelectedKey, setFacilityNameSelectedKey] =
    useState<Key | null>(null);

  const selectedListFacilityId = useMemo(() => {
    if (facilityNameSelectedKey == null || typeof facilityNameSelectedKey !== "string") {
      return null;
    }
    return facilitiesList.some((f) => f.id === facilityNameSelectedKey)
      ? facilityNameSelectedKey
      : null;
  }, [facilityNameSelectedKey, facilitiesList]);

  const checkFacility = trpc.facilities.checkExists.useQuery(
    {
      name: facilityData.name,
      city: facilityData.city.trim() ? facilityData.city.trim() : null,
      country: facilityData.country.trim() ? facilityData.country.trim() : null,
    },
    {
      enabled:
        facilityData.name.trim().length > 0 && selectedListFacilityId == null,
    },
  );

  useEffect(() => {
    if (selectedListFacilityId) {
      const f = facilitiesList.find((x) => x.id === selectedListFacilityId);
      if (!f) return;
      setExistingFacility({
        id: f.id,
        name: f.name,
        city: f.city,
        country: f.country,
        instruments: (f.instruments ?? []).map((i) => ({
          id: i.id,
          name: i.name,
        })),
      });
      setFacilityData({
        name: f.name,
        city: f.city ?? "",
        country: f.country ?? "",
        facilityType: f.facilitytype,
      });
      return;
    }
    const facility = checkFacility.data?.facility;
    if (checkFacility.data?.exists && facility) {
      setExistingFacility({
        id: facility.id,
        name: facility.name,
        city: facility.city,
        country: facility.country,
        instruments: facility.instruments.map((i) => ({
          id: i.id,
          name: i.name,
        })),
      });
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
  }, [selectedListFacilityId, facilitiesList, checkFacility.data]);

  const registeredFacilityId = existingFacility?.id;
  useEffect(() => {
    if (registeredFacilityId) {
      queueMicrotask(() => setContributeStep("instruments"));
    }
  }, [registeredFacilityId]);

  const handleStepChange = useCallback((key: Key) => {
    const id = key == null ? null : String(key);
    if (id === "facility" || id === "instruments") {
      queueMicrotask(() => setContributeStep(id));
    }
  }, []);

  const createFacility = trpc.facilities.create.useMutation();
  const createInstrument = trpc.instruments.create.useMutation();

  const facilityDetailQuery = trpc.facilities.getById.useQuery(
    existingFacility?.id ? { id: existingFacility.id } : skipToken,
  );

  const registeredInstruments = useMemo(() => {
    if (facilityDetailQuery.data?.instruments != null) {
      return [...facilityDetailQuery.data.instruments].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    }
    const fallback = existingFacility?.instruments ?? [];
    return [...fallback].sort((a, b) => a.name.localeCompare(b.name));
  }, [facilityDetailQuery.data?.instruments, existingFacility?.instruments]);

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
      const toCreate = instruments.filter((inst) => inst.name.trim().length > 0);
      if (toCreate.length === 0) {
        setSubmitStatus({
          type: "error",
          message: "Add at least one instrument with a name.",
        });
        return;
      }

      setIsSubmitting(true);
      setSubmitStatus({ type: null, message: "" });

      const createdNames: string[] = [];
      const failures: string[] = [];
      let firstInstrumentId: string | undefined;

      try {
        for (const inst of toCreate) {
          try {
            const created = await createInstrument.mutateAsync({
              facilityId: existingFacility.id,
              name: inst.name.trim(),
              link: inst.link.trim().length > 0 ? inst.link.trim() : null,
              status: inst.status,
            });
            createdNames.push(created.name);
            firstInstrumentId ??= created.id;
          } catch (err: unknown) {
            const derivedMessage =
              err instanceof Error
                ? err.message
                : typeof err === "object" && err !== null
                  ? (err as { data?: { message?: string } }).data?.message
                  : null;
            failures.push(
              `${inst.name.trim()}: ${derivedMessage ?? "Failed to create"}`,
            );
          }
        }

        if (failures.length > 0 && createdNames.length === 0) {
          setSubmitStatus({ type: "error", message: failures.join(" ") });
        } else if (failures.length > 0) {
          setSubmitStatus({
            type: "success",
            message: `Added ${createdNames.length} instrument(s). Some failed: ${failures.join(" ")}`,
          });
        } else {
          setSubmitStatus({
            type: "success",
            message:
              createdNames.length === 1
                ? `Instrument "${createdNames[0]}" added successfully.`
                : `Added ${createdNames.length} instruments successfully.`,
          });
        }

        if (createdNames.length > 0) {
          onCompleted?.({
            facilityId: existingFacility.id,
            instrumentId: firstInstrumentId,
          });
          if (isModal) {
            onClose?.();
          } else if (failures.length === 0) {
            setTimeout(() => {
              router.push(`/facilities/${existingFacility.id}`);
            }, 1500);
          }
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!facilityData.name.trim()) {
      setSubmitStatus({
        type: "error",
        message: "Facility name is required.",
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

  const namedInstrumentRows = instruments.filter(
    (i) => i.name.trim().length > 0,
  ).length;
  const canSubmit = existingFacility
    ? namedInstrumentRows > 0
    : facilityData.name.trim().length > 0;
  const instrumentCountOnFile = registeredInstruments.length;

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
          <h1 className="text-foreground mb-2 text-3xl font-bold sm:text-4xl">
            Facility and instruments
          </h1>
          <p className="text-muted mb-8 max-w-xl text-sm">
            Pick a site from the list or type a new one. If it is already in the
            database, use the Instruments step to add rows, then submit once.
          </p>

          <Form onSubmit={handleSubmit} className="space-y-8">
            <Tabs
              selectedKey={contributeStep}
              onSelectionChange={handleStepChange}
              variant="primary"
              className="w-full"
            >
              <Tabs.ListContainer className="flex justify-center">
                <Tabs.List
                  aria-label="Contribution steps"
                  className="border-border bg-surface-2 inline-flex h-11 items-center rounded-full border p-1 shadow-sm [&_.tabs__list]:flex [&_.tabs__list]:items-center [&_.tabs__list]:gap-0.5"
                >
                  <Tabs.Tab
                    id="facility"
                    className="data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground text-muted rounded-full px-4 py-2 text-sm font-semibold transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <BuildingOfficeIcon className="h-4 w-4 shrink-0" />
                      Facility
                    </span>
                    <Tabs.Indicator />
                  </Tabs.Tab>
                  <Tabs.Tab
                    id="instruments"
                    className="data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground text-muted rounded-full px-4 py-2 text-sm font-semibold transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <WrenchScrewdriverIcon className="h-4 w-4 shrink-0" />
                      Instruments
                    </span>
                    <Tabs.Indicator />
                  </Tabs.Tab>
                </Tabs.List>
              </Tabs.ListContainer>

              <Tabs.Panel id="facility" className="mt-6 outline-none">
                <Card className="border-border bg-surface-1 border shadow-sm">
                  <Card.Content className="space-y-5 p-5 sm:p-6">
                    <FacilityIdentitySection
                      facilitiesList={facilitiesList}
                      facilityNameSelectedKey={facilityNameSelectedKey}
                      onFacilityNameSelectedKeyChange={setFacilityNameSelectedKey}
                      onSelectExistingFacility={(f) => {
                        setFacilityData({
                          name: f.name,
                          city: f.city ?? "",
                          country: f.country ?? "",
                          facilityType: f.facilitytype,
                        });
                      }}
                      facilityData={facilityData}
                      onFacilityDataChange={(patch) =>
                        setFacilityData((prev) => ({ ...prev, ...patch }))
                      }
                      existingFacility={!!existingFacility}
                      existingFacilityId={existingFacility?.id ?? null}
                      instrumentCountOnFile={instrumentCountOnFile}
                    />
                  </Card.Content>
                </Card>
              </Tabs.Panel>

              <Tabs.Panel id="instruments" className="mt-6 outline-none">
                <Card className="border-border bg-surface-1 border shadow-sm">
                  <Card.Content className="space-y-5 p-5 sm:p-6">
                    {existingFacility ? (
                      <>
                        <RegisteredInstrumentsAccordion
                          items={registeredInstruments}
                          facilityId={existingFacility.id}
                          isListRefreshing={facilityDetailQuery.isFetching}
                          onInstrumentUpdated={() => {
                            void facilityDetailQuery.refetch();
                          }}
                        />
                        <Separator className="bg-border" />
                      </>
                    ) : null}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-muted text-sm">
                        {existingFacility
                          ? "Add new instruments below."
                          : "Optional: add instruments now, or create the site first and come back later."}
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        onPress={addInstrument}
                        className="inline-flex shrink-0 items-center gap-2"
                      >
                        <PlusIcon className="h-4 w-4 shrink-0" />
                        <span>Add instrument</span>
                      </Button>
                    </div>

                    <NewInstrumentsAccordion
                      instruments={instruments}
                      facilityId={existingFacility?.id}
                      onChange={(index, field, value) =>
                        updateInstrument(index, field, value)
                      }
                      onRemove={removeInstrument}
                    />
                  </Card.Content>
                </Card>
              </Tabs.Panel>
            </Tabs>

            <Separator className="bg-border" />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted text-xs sm:max-w-sm">
                {existingFacility
                  ? "Expand a registered row to edit; save changes there. Submit adds only new instruments below."
                  : "Submit creates the facility and any named instrument rows."}
              </p>
              <Button
                type="submit"
                variant="primary"
                isDisabled={isSubmitting || !canSubmit}
                className="inline-flex items-center gap-2"
              >
                {existingFacility ? (
                  <WrenchScrewdriverIcon className="h-4 w-4 shrink-0" />
                ) : (
                  <BuildingOfficeIcon className="h-4 w-4 shrink-0" />
                )}
                <span>
                  {isSubmitting
                    ? "Working..."
                    : existingFacility
                      ? "Submit instruments"
                      : "Create facility"}
                </span>
              </Button>
            </div>

            {submitStatus.type ? (
              <div
                className={
                  submitStatus.type === "success"
                    ? "border-success/50 bg-success/10 text-foreground rounded-xl border p-4"
                    : "border-error/50 bg-error/10 text-foreground rounded-xl border p-4"
                }
              >
                {submitStatus.message}
              </div>
            ) : null}
          </Form>
        </div>
      </div>
    </>
  );
}
