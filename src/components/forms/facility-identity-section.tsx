"use client";

import type { Key } from "@heroui/react";
import {
  Button,
  Chip,
  ComboBox,
  Description,
  Input,
  InputGroup,
  Label as HeroLabel,
  ListBox,
  Select,
  TextField,
} from "@heroui/react";
import { BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { FieldTooltip } from "~/components/ui/field-tooltip";
import { FACILITY_TYPE_OPTIONS } from "./constants";
import type { FacilityIdentitySectionProps, FacilityType } from "./types";

export function FacilityIdentitySection({
  facilitiesList,
  facilityNameSelectedKey,
  onFacilityNameSelectedKeyChange,
  onSelectExistingFacility,
  facilityData,
  onFacilityDataChange,
  existingFacility,
  instrumentCountOnFile,
  existingFacilityId,
}: FacilityIdentitySectionProps) {
  const router = useRouter();

  return (
    <>
      {existingFacility && existingFacilityId ? (
        <div className="flex flex-wrap items-center gap-3">
          <Chip size="sm" variant="soft" color="accent" className="font-medium">
            Registered
          </Chip>
          <span className="text-muted text-xs">
            {instrumentCountOnFile} instrument
            {instrumentCountOnFile === 1 ? "" : "s"} on file
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ms-auto inline-flex items-center gap-2"
            onPress={() => router.push(`/facilities/${existingFacilityId}`)}
          >
            <BuildingOfficeIcon className="h-4 w-4 shrink-0" />
            <span>Open</span>
          </Button>
        </div>
      ) : null}

      <ComboBox
        fullWidth
        allowsCustomValue
        isRequired
        aria-label="Facility Name"
        selectedKey={facilityNameSelectedKey}
        onSelectionChange={(key: Key | null) => {
          onFacilityNameSelectedKeyChange(key);
          if (key != null && typeof key === "string") {
            const f = facilitiesList.find((fac) => fac.id === key);
            if (f) {
              onSelectExistingFacility(f);
            }
          }
        }}
        inputValue={facilityData.name}
        onInputChange={(value) => {
          onFacilityDataChange({ name: value });
          onFacilityNameSelectedKeyChange(null);
        }}
        items={facilitiesList}
        className="w-full"
      >
        <HeroLabel className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
          Facility{" "}
          <span className="text-danger" aria-hidden>
            *
          </span>
          <FieldTooltip description="Official facility name" />
        </HeroLabel>
        <ComboBox.InputGroup className="focus-within:border-accent focus-within:shadow-glow-sm w-full rounded-lg border-2 border-accent/45 bg-accent/[0.07] shadow-sm transition-[border-color,box-shadow]">
          <Input
            placeholder="Search or type a new name"
            className="bg-transparent! shadow-none!"
          />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <Description className="text-muted mt-1.5 text-xs">
          Existing sites match as you type; new sites need type and location
          below.
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
          onChange={(value) => onFacilityDataChange({ city: value })}
          variant="secondary"
          fullWidth
          isDisabled={existingFacility}
        >
          <HeroLabel className="text-foreground mb-1.5 block text-sm font-medium">
            City
            <FieldTooltip description="City or locality" />
          </HeroLabel>
          <InputGroup variant="secondary" fullWidth>
            <InputGroup.Input placeholder="e.g., Berkeley" />
          </InputGroup>
        </TextField>
        <TextField
          name="country"
          value={facilityData.country}
          onChange={(value) => onFacilityDataChange({ country: value })}
          variant="secondary"
          fullWidth
          isDisabled={existingFacility}
        >
          <HeroLabel className="text-foreground mb-1.5 block text-sm font-medium">
            Country
            <FieldTooltip description="Country" />
          </HeroLabel>
          <InputGroup variant="secondary" fullWidth>
            <InputGroup.Input placeholder="e.g., United States" />
          </InputGroup>
        </TextField>
      </div>

      <div>
        <HeroLabel className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
          Type{" "}
          <span className="text-danger" aria-hidden>
            *
          </span>
          <span className="sr-only">(required)</span>
          <FieldTooltip description="Facility category" />
        </HeroLabel>
        <Select
          className="w-full"
          isRequired
          isDisabled={existingFacility}
          value={facilityData.facilityType}
          onChange={(value) => {
            if (value == null) return;
            const next = String(
              Array.isArray(value) ? value[0] : value,
            ) as FacilityType;
            onFacilityDataChange({ facilityType: next });
          }}
        >
          <Select.Trigger className="border-border bg-surface-2 min-h-[44px] w-full rounded-lg border shadow-none">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox aria-label="Facility types" className="w-full">
              {FACILITY_TYPE_OPTIONS.map((opt) => (
                <ListBox.Item
                  id={opt.id}
                  key={opt.id}
                  textValue={opt.label}
                >
                  {opt.label}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>
    </>
  );
}
