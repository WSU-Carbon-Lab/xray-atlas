import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { ALS_11012_INSTRUMENT_SLUG, ALS_5322_INSTRUMENT_SLUG } from "./bindings";
import { listDashboardConnectorsFromDb } from "./resolve-dashboard-connectors";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeGreaterThan: (expected: number) => void;
  toContain: (value: unknown) => void;
  toBeUndefined: () => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

type MockInstrumentRow = {
  id: string;
  name: string;
  facilities: { name: string };
};

function createMockDb(instruments: MockInstrumentRow[]) {
  return {
    instruments: {
      findMany: async () => instruments,
    },
  };
}

const ALS_FACILITY = "Advanced Light Source";
const NSLS_FACILITY = "National Synchrotron Light Source II";

describe("listDashboardConnectorsFromDb", () => {
  it("builds one card per ALS instrument with DB labels and no placeholder beamlines", async () => {
    const cards = await listDashboardConnectorsFromDb(
      createMockDb([
        {
          id: "als-uuid_beamline_5_3_2_2",
          name: "Beamline 5.3.2.2",
          facilities: { name: ALS_FACILITY },
        },
        {
          id: "als-uuid_beamline_11_0_1_2",
          name: "Beamline 11.0.1.2",
          facilities: { name: ALS_FACILITY },
        },
      ]) as never,
    );

    expect(cards.length).toBe(2);
    expect(cards.some((card) => card.instrumentLabel.includes("5.3.2.1"))).toBe(
      false,
    );
    expect(cards.some((card) => card.instrumentLabel.includes("7.3.1"))).toBe(
      false,
    );

    const primary = cards.find((card) => card.slug === ALS_5322_INSTRUMENT_SLUG);
    expect(primary?.instrumentLabel).toBe("Beamline 5.3.2.2");
    expect(primary?.facilityLabel).toBe(ALS_FACILITY);
    expect(primary?.readiness).toBe("beta");
    expect(primary?.instrumentId).toBe("als-uuid_beamline_5_3_2_2");

    const beamline11012 = cards.find(
      (card) => card.slug === ALS_11012_INSTRUMENT_SLUG,
    );
    expect(beamline11012?.instrumentLabel).toBe("Beamline 11.0.1.2");
    expect(beamline11012?.readiness).toBe("not_ready");
  });

  it("includes NSLS-II instruments as coming-soon cards with DB labels", async () => {
    const cards = await listDashboardConnectorsFromDb(
      createMockDb([
        {
          id: "nsls-sst1",
          name: "SST1",
          facilities: { name: NSLS_FACILITY },
        },
        {
          id: "nsls-smi",
          name: "SMI",
          facilities: { name: NSLS_FACILITY },
        },
      ]) as never,
    );

    expect(cards.length).toBe(2);

    const sst1 = cards.find((card) => card.instrumentLabel === "SST1");
    expect(sst1?.facilityLabel).toBe(NSLS_FACILITY);
    expect(sst1?.readiness).toBe("not_ready");
    expect(sst1?.slug).toBe("nsls-sst1");

    const smi = cards.find((card) => card.instrumentLabel === "SMI");
    expect(smi?.facilityLabel).toBe(NSLS_FACILITY);
    expect(smi?.readiness).toBe("not_ready");
  });

  it("renders unmatched DB instruments as coming soon with database labels", async () => {
    const cards = await listDashboardConnectorsFromDb(
      createMockDb([
        {
          id: "als-uuid_beamline_11_0_2",
          name: "Beamline 11.0.2",
          facilities: { name: ALS_FACILITY },
        },
      ]) as never,
    );

    expect(cards.length).toBe(1);
    expect(cards[0]?.instrumentLabel).toBe("Beamline 11.0.2");
    expect(cards[0]?.facilityLabel).toBe(ALS_FACILITY);
    expect(cards[0]?.readiness).toBe("not_ready");
    expect(cards[0]?.slug).toBe("als-uuid_beamline_11_0_2");
  });

  it("does not emit binding-only cards when the database is empty", async () => {
    const cards = await listDashboardConnectorsFromDb(createMockDb([]) as never);
    expect(cards.length).toBe(0);
  });

  it("sorts beta connectors before coming-soon cards", async () => {
    const cards = await listDashboardConnectorsFromDb(
      createMockDb([
        {
          id: "als-uuid_beamline_11_0_1_2",
          name: "Beamline 11.0.1.2",
          facilities: { name: ALS_FACILITY },
        },
        {
          id: "als-uuid_beamline_5_3_2_2",
          name: "Beamline 5.3.2.2",
          facilities: { name: ALS_FACILITY },
        },
      ]) as never,
    );

    const firstNotReadyIndex = cards.findIndex(
      (card) => card.readiness === "not_ready",
    );
    const lastBetaIndex = cards.reduce(
      (index, card, currentIndex) =>
        card.readiness === "beta" ? currentIndex : index,
      -1,
    );

    expect(lastBetaIndex).toBeGreaterThan(-1);
    expect(firstNotReadyIndex).toBeGreaterThan(lastBetaIndex);
  });
});
