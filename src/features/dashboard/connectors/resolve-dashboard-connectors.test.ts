import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  ALS_11012_INSTRUMENT_SLUG,
  ALS_5322_INSTRUMENT_SLUG,
  ANSTO_SXR_INSTRUMENT_SLUG,
  listDashboardConnectorBindings,
} from "./bindings";
import { listDashboardConnectorsFromDb } from "./resolve-dashboard-connectors";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeGreaterThan: (expected: number) => void;
  toBeDefined: () => void;
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

describe("listDashboardConnectorsFromDb", () => {
  it("builds cards from matched instrument rows with DB labels", async () => {
    const cards = await listDashboardConnectorsFromDb(
      createMockDb([
        {
          id: "als-uuid_beamline_5_3_2_2",
          name: "Beamline 5.3.2.2",
          facilities: { name: "Advanced Light Source" },
        },
        {
          id: "als-uuid_beamline_7_3_1",
          name: "Beamline 7.3.1",
          facilities: { name: "Advanced Light Source" },
        },
      ]) as never,
    );

    expect(cards.length).toBe(listDashboardConnectorBindings().length);
    const primary = cards.find((card) => card.slug === ALS_5322_INSTRUMENT_SLUG);
    expect(primary?.instrumentLabel).toBe("Beamline 5.3.2.2");
    expect(primary?.facilityLabel).toBe("Advanced Light Source");
    expect(primary?.readiness).toBe("beta");
  });

  it("includes unmatched bindings as coming-soon cards", async () => {
    const cards = await listDashboardConnectorsFromDb(
      createMockDb([
        {
          id: "als-uuid_beamline_5_3_2_2",
          name: "Beamline 5.3.2.2",
          facilities: { name: "Advanced Light Source" },
        },
      ]) as never,
    );

    expect(cards.length).toBe(listDashboardConnectorBindings().length);
    const comingSoon = cards.find((card) => card.slug === "als-5321");
    expect(comingSoon?.readiness).toBe("not_ready");
    expect(comingSoon?.instrumentLabel).toBe("Beamline 5.3.2.1 (STXM)");
    expect(comingSoon?.facilityLabel).toBe("Advanced Light Source");
    expect(comingSoon?.instrumentId).toBeUndefined();
  });

  it("does not add cards for instruments without a dashboard binding", async () => {
    const cards = await listDashboardConnectorsFromDb(
      createMockDb([
        {
          id: "als-uuid_sxr",
          name: "Beamline 11.0.2",
          facilities: { name: "Advanced Light Source" },
        },
      ]) as never,
    );

    expect(cards.length).toBe(listDashboardConnectorBindings().length);
    expect(cards.some((card) => card.instrumentLabel === "Beamline 11.0.2")).toBe(
      false,
    );
  });

  it("registers 11.0.1.2 and SXR placeholder bindings", async () => {
    const cards = await listDashboardConnectorsFromDb(createMockDb([]) as never);
    const beamline11012 = cards.find((card) => card.slug === ALS_11012_INSTRUMENT_SLUG);
    const sxr = cards.find((card) => card.slug === ANSTO_SXR_INSTRUMENT_SLUG);

    expect(beamline11012).toBeDefined();
    expect(beamline11012?.instrumentLabel).toBe("Beamline 11.0.1.2");
    expect(beamline11012?.facilityLabel).toBe("Advanced Light Source");
    expect(beamline11012?.readiness).toBe("not_ready");

    expect(sxr).toBeDefined();
    expect(sxr?.instrumentLabel).toBe("SXR");
    expect(sxr?.facilityLabel).toBe("The Australian Synchrotron");
    expect(sxr?.readiness).toBe("not_ready");
  });

  it("sorts beta connectors before coming-soon cards", async () => {
    const cards = await listDashboardConnectorsFromDb(createMockDb([]) as never);
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
