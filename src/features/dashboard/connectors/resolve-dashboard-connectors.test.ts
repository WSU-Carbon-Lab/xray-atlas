import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { ALS_5322_INSTRUMENT_SLUG } from "./bindings";
import { listDashboardConnectorsFromDb } from "./resolve-dashboard-connectors";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeGreaterThan: (expected: number) => void;
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

    expect(cards.length).toBeGreaterThan(1);
    const primary = cards.find((card) => card.slug === ALS_5322_INSTRUMENT_SLUG);
    expect(primary?.label).toBe("Beamline 5.3.2.2");
    expect(primary?.facilityLabel).toBe("Advanced Light Source");
    expect(primary?.readiness).toBe("beta");
  });

  it("omits instruments with no dashboard binding", async () => {
    const cards = await listDashboardConnectorsFromDb(
      createMockDb([
        {
          id: "als-uuid_sxr",
          name: "Beamline 11.0.2",
          facilities: { name: "Advanced Light Source" },
        },
      ]) as never,
    );

    expect(cards.length).toBe(0);
  });
});
