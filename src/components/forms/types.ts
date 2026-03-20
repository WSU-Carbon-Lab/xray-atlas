export type InstrumentStatus = "active" | "inactive" | "under_maintenance";

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

