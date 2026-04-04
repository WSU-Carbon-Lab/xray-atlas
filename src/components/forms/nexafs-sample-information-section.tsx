"use client";

import type { ProcessMethod } from "~/prisma/browser";
import { Label, TextField, InputGroup } from "@heroui/react";
import { FieldTooltip } from "~/components/ui/field-tooltip";
import { PROCESS_METHOD_OPTIONS } from "~/features/process-nexafs/constants";
import type { NexafsSampleInformationSectionProps } from "./types";

const formLabelClass =
  "mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground";

const selectClass =
  "border-border bg-field-background text-field-foreground placeholder:text-field-placeholder focus:border-accent focus:ring-accent/20 w-full rounded-xl border px-4 py-2.5 focus:outline-none focus:ring-2";

export function NexafsSampleInformationSection({
  processMethod,
  setProcessMethod,
  substrate,
  setSubstrate,
  solvent,
  setSolvent,
  thickness,
  setThickness,
  molecularWeight,
  setMolecularWeight,
  selectedVendorId,
  setSelectedVendorId,
  newVendorName,
  setNewVendorName,
  newVendorUrl,
  setNewVendorUrl,
  vendors,
  isLoadingVendors,
}: NexafsSampleInformationSectionProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-foreground text-xl font-semibold">
          2. Sample Information
        </h2>
        <p className="text-muted text-sm">
          Provide context describing the specimen used across your experiments.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="processMethod" className={formLabelClass}>
              Process Method
              <FieldTooltip description="Method used to process the sample" />
            </Label>
            <select
              id="processMethod"
              name="processMethod"
              value={processMethod ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setProcessMethod(v.length > 0 ? (v as ProcessMethod) : null);
              }}
              className={selectClass}
              aria-label="Process method"
            >
              <option value="">Select an option</option>
              {PROCESS_METHOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <TextField
            name="substrate"
            value={substrate}
            onChange={setSubstrate}
            variant="secondary"
            fullWidth
          >
            <Label className={formLabelClass}>
              Substrate
              <FieldTooltip description="Substrate material on which the sample sits" />
            </Label>
            <InputGroup variant="secondary" fullWidth>
              <InputGroup.Input placeholder="e.g., Si wafer, glass" />
            </InputGroup>
          </TextField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            name="solvent"
            value={solvent}
            onChange={setSolvent}
            variant="secondary"
            fullWidth
          >
            <Label className={formLabelClass}>
              Solvent
              <FieldTooltip description="Solvent used during sample prep (if any)" />
            </Label>
            <InputGroup variant="secondary" fullWidth>
              <InputGroup.Input placeholder="e.g., chloroform, toluene" />
            </InputGroup>
          </TextField>
          <TextField
            name="thickness"
            value={thickness != null ? String(thickness) : ""}
            onChange={(v) => setThickness(v !== "" ? parseFloat(v) : null)}
            variant="secondary"
            fullWidth
          >
            <Label className={formLabelClass}>
              Thickness (nm)
              <FieldTooltip description="Sample thickness in nanometers" />
            </Label>
            <InputGroup variant="secondary" fullWidth>
              <InputGroup.Input
                type="number"
                placeholder="e.g., 50"
                min={0}
                step={0.1}
              />
            </InputGroup>
          </TextField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            name="molecularWeight"
            value={molecularWeight != null ? String(molecularWeight) : ""}
            onChange={(v) =>
              setMolecularWeight(v !== "" ? parseFloat(v) : null)
            }
            variant="secondary"
            fullWidth
          >
            <Label className={formLabelClass}>
              Molecular Weight (g/mol)
              <FieldTooltip description="Molecular weight in grams per mole" />
            </Label>
            <InputGroup variant="secondary" fullWidth>
              <InputGroup.Input
                type="number"
                placeholder="e.g., 1000.5"
                min={0}
                step={0.01}
              />
            </InputGroup>
          </TextField>
          <div>
            <Label htmlFor="vendor" className={formLabelClass}>
              Select Existing Vendor
              <FieldTooltip description="Pick an existing vendor or add a new one" />
            </Label>
            <select
              id="vendor"
              name="vendor"
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className={selectClass}
              aria-label="Select vendor"
            >
              <option value="">
                {isLoadingVendors
                  ? "Loading vendors..."
                  : "Select an option"}
              </option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <p className="text-foreground text-sm font-medium">
            Or create a new vendor
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <TextField
              name="newVendorName"
              value={newVendorName}
              onChange={setNewVendorName}
              variant="secondary"
              fullWidth
            >
              <Label className={formLabelClass}>Vendor name</Label>
              <InputGroup variant="secondary" fullWidth>
                <InputGroup.Input placeholder="Vendor name" />
              </InputGroup>
            </TextField>
            <TextField
              name="newVendorUrl"
              value={newVendorUrl}
              onChange={setNewVendorUrl}
              variant="secondary"
              fullWidth
            >
              <Label className={formLabelClass}>
                Vendor website (optional)
              </Label>
              <InputGroup variant="secondary" fullWidth>
                <InputGroup.Input placeholder="Vendor website (optional)" />
              </InputGroup>
            </TextField>
          </div>
        </div>
      </div>
    </section>
  );
}
