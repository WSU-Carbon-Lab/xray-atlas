"use client";

import { useState } from "react";
import { DefaultButton as Button } from "~/app/components/Button";
import { SimpleDialog } from "~/app/components/SimpleDialog";
import { FormField } from "~/app/components/FormField";
import { trpc } from "~/trpc/client";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface AddFacilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFacilityCreated: (facilityId: string, instrumentId: string) => void;
}

export function AddFacilityModal({
  isOpen,
  onClose,
  onFacilityCreated,
}: AddFacilityModalProps) {
  const [facilityData, setFacilityData] = useState({
    name: "",
    city: "",
    country: "",
    facilityType: "LAB_SOURCE" as "SYNCHROTRON" | "FREE_ELECTRON_LASER" | "LAB_SOURCE",
  });

  const [instruments, setInstruments] = useState<
    Array<{ name: string; link: string; status: string }>
  >([{ name: "", link: "", status: "active" }]);

  const [error, setError] = useState<string | null>(null);

  const createFacility = trpc.facilities.create.useMutation();

  const handleAddInstrument = () => {
    setInstruments((prev) => [...prev, { name: "", link: "", status: "active" }]);
  };

  const handleRemoveInstrument = (index: number) => {
    setInstruments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateInstrument = (
    index: number,
    field: "name" | "link" | "status",
    value: string,
  ) => {
    setInstruments((prev) =>
      prev.map((inst, i) => (i === index ? { ...inst, [field]: value } : inst)),
    );
  };

  const handleSubmit = async () => {
    if (!facilityData.name.trim()) {
      setError("Facility name is required");
      return;
    }

    if (instruments.length === 0 || !instruments[0]?.name.trim()) {
      setError("At least one instrument with a name is required");
      return;
    }

    setError(null);

    try {
      const result = await createFacility.mutateAsync({
        name: facilityData.name.trim(),
        city: facilityData.city.trim() || undefined,
        country: facilityData.country.trim() || undefined,
        facilityType: facilityData.facilityType,
        instruments: instruments
          .filter((inst) => inst.name.trim())
          .map((inst) => ({
            name: inst.name.trim(),
            link: inst.link.trim() || undefined,
            status: inst.status as "active" | "inactive" | "under_maintenance",
          })),
      });

      // Return the first instrument ID
      const firstInstrument = result.instruments[0];
      if (firstInstrument) {
        onFacilityCreated(result.facility.id, firstInstrument.id);
      }

      // Reset form
      setFacilityData({
        name: "",
        city: "",
        country: "",
        facilityType: "LAB_SOURCE",
      });
      setInstruments([{ name: "", link: "", status: "active" }]);
      setError(null);
      onClose();
    } catch (error) {
      console.error("Failed to create facility:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create facility",
      );
    }
  };

  return (
    <SimpleDialog isOpen={isOpen} onClose={onClose} title="Add Facility and Instrument">
      <div className="space-y-6 max-h-[80vh] overflow-y-auto">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Facility Fields */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Facility Information
          </h3>
          <FormField
            label="Facility Name"
            type="text"
            name="name"
            value={facilityData.name}
            onChange={(value) =>
              setFacilityData((prev) => ({ ...prev, name: value as string }))
            }
            required
          />
          <FormField
            label="City"
            type="text"
            name="city"
            value={facilityData.city}
            onChange={(value) =>
              setFacilityData((prev) => ({ ...prev, city: value as string }))
            }
          />
          <FormField
            label="Country"
            type="text"
            name="country"
            value={facilityData.country}
            onChange={(value) =>
              setFacilityData((prev) => ({ ...prev, country: value as string }))
            }
          />
          <FormField
            label="Facility Type"
            type="select"
            name="facilityType"
            value={facilityData.facilityType}
            onChange={(value) =>
              setFacilityData((prev) => ({
                ...prev,
                facilityType: value as "SYNCHROTRON" | "FREE_ELECTRON_LASER" | "LAB_SOURCE",
              }))
            }
            options={[
              { value: "SYNCHROTRON", label: "Synchrotron" },
              { value: "FREE_ELECTRON_LASER", label: "Free Electron Laser" },
              { value: "LAB_SOURCE", label: "Lab Source" },
            ]}
            required
          />
        </div>

        {/* Instruments */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Instruments
            </h3>
            <Button
              type="button"
              variant="bordered"
              size="sm"
              onClick={handleAddInstrument}
            >
              <PlusIcon className="mr-1 h-4 w-4" />
              Add Instrument
            </Button>
          </div>
          {instruments.map((instrument, index) => (
            <div
              key={index}
              className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Instrument {index + 1}
                </span>
                {instruments.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveInstrument(index)}
                    className="rounded p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <FormField
                  label="Instrument Name"
                  type="text"
                  name={`instrument-${index}-name`}
                  value={instrument.name}
                  onChange={(value) =>
                    handleUpdateInstrument(index, "name", value as string)
                  }
                  required
                />
                <FormField
                  label="Link (Optional)"
                  type="text"
                  name={`instrument-${index}-link`}
                  value={instrument.link}
                  onChange={(value) =>
                    handleUpdateInstrument(index, "link", value as string)
                  }
                />
                <FormField
                  label="Status"
                  type="select"
                  name={`instrument-${index}-status`}
                  value={instrument.status}
                  onChange={(value) =>
                    handleUpdateInstrument(index, "status", value as string)
                  }
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                    { value: "under_maintenance", label: "Under Maintenance" },
                  ]}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="bordered" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="solid"
            onClick={handleSubmit}
            disabled={createFacility.isPending}
          >
            {createFacility.isPending ? "Creating..." : "Create Facility"}
          </Button>
        </div>
      </div>
    </SimpleDialog>
  );
}
