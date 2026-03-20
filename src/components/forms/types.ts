import type { Key } from "@heroui/react";
import type { ReactNode } from "react";

export type InstrumentStatus = "active" | "inactive" | "under_maintenance";

export type FacilityType = "LAB_SOURCE" | "SYNCHROTRON" | "FREE_ELECTRON_LASER";

export type InstrumentFormData = {
  name: string;
  link: string;
  status: InstrumentStatus;
};

export type RegisteredInstrumentSnapshot = {
  id: string;
  name: string;
  link: string | null;
  status: string;
};

export type FacilityFormState = {
  name: string;
  city: string;
  country: string;
  facilityType: FacilityType;
};

export type FacilityListItemForIdentity = {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
  facilitytype: FacilityType;
};

export type RegisteredInstrumentStatusChipColor = "success" | "default" | "warning";

export type RegisteredInstrumentStatusPresentation = {
  label: string;
  chipColor: RegisteredInstrumentStatusChipColor;
};

export type InstrumentContributionFormProps = {
  facilityId?: string;
  facilityName?: string;
  onCompleted?: (payload: { instrumentId: string; facilityId: string }) => void;
  onClose?: () => void;
};

export type InstrumentContributionFormMessage = {
  type: "success" | "error";
  text: string;
};

export type InstrumentFieldsBlockProps = {
  instrument: InstrumentFormData;
  onChange: (
    field: keyof InstrumentFormData,
    value: InstrumentFormData[keyof InstrumentFormData],
  ) => void;
  nameFieldName: string;
  linkFieldName: string;
  nameLabel: string;
  linkLabel: string;
  namePlaceholder?: string;
  nameInputGroupClassName?: string;
  duplicateWarning?: ReactNode;
  statusListboxLabel?: string;
  nameFieldTooltip?: string;
  linkFieldTooltip?: string;
  statusFieldTooltip?: string;
};

export type FacilityIdentitySectionProps = {
  facilitiesList: FacilityListItemForIdentity[];
  facilityNameSelectedKey: Key | null;
  onFacilityNameSelectedKeyChange: (key: Key | null) => void;
  onSelectExistingFacility: (facility: FacilityListItemForIdentity) => void;
  facilityData: FacilityFormState;
  onFacilityDataChange: (patch: Partial<FacilityFormState>) => void;
  existingFacility: boolean;
  existingFacilityId: string | null;
  instrumentCountOnFile: number;
};

export type RegisteredInstrumentListItem = {
  id: string;
  name: string;
  link?: string | null;
  status?: string;
};

export type RegisteredInstrumentsAccordionProps = {
  items: RegisteredInstrumentListItem[];
  facilityId: string;
  isListRefreshing?: boolean;
  onInstrumentUpdated: () => void;
};

export type NewInstrumentsAccordionProps = {
  instruments: InstrumentFormData[];
  facilityId: string | undefined;
  onChange: (
    index: number,
    field: keyof InstrumentFormData,
    value: InstrumentFormData[keyof InstrumentFormData],
  ) => void;
  onRemove: (index: number) => void;
};

export type RegisteredInstrumentEditorProps = {
  facilityId: string;
  instrument: RegisteredInstrumentSnapshot;
  embedded?: boolean;
  onUpdated: () => void;
};

export type MoleculeContributionFormProps = {
  variant?: "page" | "modal";
  onCompleted?: (payload: { moleculeId?: string }) => void;
  onClose?: () => void;
  className?: string;
};

export type MoleculeContributePageProps = MoleculeContributionFormProps;

export type InstrumentNewRowFormProps = {
  instrument: InstrumentFormData;
  facilityId?: string;
  onChange: (
    field: keyof InstrumentFormData,
    value: InstrumentFormData[keyof InstrumentFormData],
  ) => void;
  onRemove: () => void;
};
