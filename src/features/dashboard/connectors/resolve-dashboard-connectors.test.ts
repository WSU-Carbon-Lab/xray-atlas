import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { ALS_11012_INSTRUMENT_SLUG, ALS_5322_INSTRUMENT_SLUG } from "./bindings";
import {
  listDashboardConnectorsFromDb,
  paginateDashboardConnectors,
  type DashboardConnectorCardDto,
} from "./resolve-dashboard-connectors";

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
  facilityid: string;
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
const ALS_FACILITY_ID = "11111111-1111-4111-8111-111111111111";
const NSLS_FACILITY_ID = "22222222-2222-4222-8222-222222222222";

async function listAllConnectors(instruments: MockInstrumentRow[]) {
  return listDashboardConnectorsFromDb(createMockDb(instruments) as never, {
    limit: 100,
    offset: 0,
  });
}

describe("paginateDashboardConnectors", () => {
  const sampleCards: DashboardConnectorCardDto[] = [
    {
      slug: "als-5322",
      instrumentId: "inst-1",
      facilityId: ALS_FACILITY_ID,
      facilityLabel: ALS_FACILITY,
      instrumentLabel: "Beamline 5.3.2.2",
      description: "beta workspace",
      readiness: "beta",
    },
    {
      slug: "inst-2",
      instrumentId: "inst-2",
      facilityId: ALS_FACILITY_ID,
      facilityLabel: ALS_FACILITY,
      instrumentLabel: "Beamline 11.0.1.2",
      description: "coming soon",
      readiness: "not_ready",
    },
    {
      slug: "inst-3",
      instrumentId: "inst-3",
      facilityId: NSLS_FACILITY_ID,
      facilityLabel: NSLS_FACILITY,
      instrumentLabel: "SST1",
      description: "coming soon",
      readiness: "not_ready",
    },
  ];

  it("returns the first page with total and hasMore", () => {
    const page = paginateDashboardConnectors(sampleCards, { limit: 2, offset: 0 });

    expect(page.items.length).toBe(2);
    expect(page.total).toBe(3);
    expect(page.hasMore).toBe(true);
    expect(page.items[0]?.slug).toBe("als-5322");
    expect(page.items[1]?.slug).toBe("inst-2");
  });

  it("returns the final partial page without hasMore", () => {
    const page = paginateDashboardConnectors(sampleCards, { limit: 2, offset: 2 });

    expect(page.items.length).toBe(1);
    expect(page.total).toBe(3);
    expect(page.hasMore).toBe(false);
    expect(page.items[0]?.slug).toBe("inst-3");
  });

  it("returns an empty page when offset exceeds the catalog length", () => {
    const page = paginateDashboardConnectors(sampleCards, { limit: 2, offset: 10 });

    expect(page.items.length).toBe(0);
    expect(page.total).toBe(3);
    expect(page.hasMore).toBe(false);
  });
});

describe("listDashboardConnectorsFromDb", () => {
  it("builds one card per ALS instrument with DB labels and no placeholder beamlines", async () => {
    const page = await listAllConnectors([
      {
        id: "als-uuid_beamline_5_3_2_2",
        facilityid: ALS_FACILITY_ID,
        name: "Beamline 5.3.2.2",
        facilities: { name: ALS_FACILITY },
      },
      {
        id: "als-uuid_beamline_11_0_1_2",
        facilityid: ALS_FACILITY_ID,
        name: "Beamline 11.0.1.2",
        facilities: { name: ALS_FACILITY },
      },
    ]);

    const cards = page.items;
    expect(page.total).toBe(2);
    expect(cards.some((card) => card.instrumentLabel.includes("5.3.2.1"))).toBe(
      false,
    );
    expect(cards.some((card) => card.instrumentLabel.includes("7.3.1"))).toBe(
      false,
    );

    const primary = cards.find((card) => card.slug === ALS_5322_INSTRUMENT_SLUG);
    expect(primary?.instrumentLabel).toBe("Beamline 5.3.2.2");
    expect(primary?.facilityLabel).toBe(ALS_FACILITY);
    expect(primary?.facilityId).toBe(ALS_FACILITY_ID);
    expect(primary?.readiness).toBe("beta");
    expect(primary?.instrumentId).toBe("als-uuid_beamline_5_3_2_2");

    const beamline11012 = cards.find(
      (card) => card.slug === ALS_11012_INSTRUMENT_SLUG,
    );
    expect(beamline11012?.instrumentLabel).toBe("Beamline 11.0.1.2");
    expect(beamline11012?.readiness).toBe("not_ready");
  });

  it("includes NSLS-II instruments as coming-soon cards with DB labels", async () => {
    const page = await listAllConnectors([
      {
        id: "nsls-sst1",
        facilityid: NSLS_FACILITY_ID,
        name: "SST1",
        facilities: { name: NSLS_FACILITY },
      },
      {
        id: "nsls-smi",
        facilityid: NSLS_FACILITY_ID,
        name: "SMI",
        facilities: { name: NSLS_FACILITY },
      },
    ]);

    const cards = page.items;
    expect(page.total).toBe(2);

    const sst1 = cards.find((card) => card.instrumentLabel === "SST1");
    expect(sst1?.facilityLabel).toBe(NSLS_FACILITY);
    expect(sst1?.facilityId).toBe(NSLS_FACILITY_ID);
    expect(sst1?.readiness).toBe("not_ready");
    expect(sst1?.slug).toBe("nsls-sst1");

    const smi = cards.find((card) => card.instrumentLabel === "SMI");
    expect(smi?.facilityLabel).toBe(NSLS_FACILITY);
    expect(smi?.readiness).toBe("not_ready");
  });

  it("renders unmatched DB instruments as coming soon with database labels", async () => {
    const page = await listAllConnectors([
      {
        id: "als-uuid_beamline_11_0_2",
        facilityid: ALS_FACILITY_ID,
        name: "Beamline 11.0.2",
        facilities: { name: ALS_FACILITY },
      },
    ]);

    expect(page.total).toBe(1);
    expect(page.items[0]?.instrumentLabel).toBe("Beamline 11.0.2");
    expect(page.items[0]?.facilityLabel).toBe(ALS_FACILITY);
    expect(page.items[0]?.readiness).toBe("not_ready");
    expect(page.items[0]?.slug).toBe("als-uuid_beamline_11_0_2");
  });

  it("does not emit binding-only cards when the database is empty", async () => {
    const page = await listDashboardConnectorsFromDb(createMockDb([]) as never, {
      limit: 9,
      offset: 0,
    });
    expect(page.total).toBe(0);
    expect(page.items.length).toBe(0);
    expect(page.hasMore).toBe(false);
  });

  it("sorts beta connectors before coming-soon cards", async () => {
    const page = await listAllConnectors([
      {
        id: "als-uuid_beamline_11_0_1_2",
        facilityid: ALS_FACILITY_ID,
        name: "Beamline 11.0.1.2",
        facilities: { name: ALS_FACILITY },
      },
      {
        id: "als-uuid_beamline_5_3_2_2",
        facilityid: ALS_FACILITY_ID,
        name: "Beamline 5.3.2.2",
        facilities: { name: ALS_FACILITY },
      },
    ]);

    const cards = page.items;
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

  it("applies limit and offset after sorting", async () => {
    const page = await listDashboardConnectorsFromDb(
      createMockDb([
        {
          id: "als-uuid_beamline_5_3_2_2",
          facilityid: ALS_FACILITY_ID,
          name: "Beamline 5.3.2.2",
          facilities: { name: ALS_FACILITY },
        },
        {
          id: "als-uuid_beamline_11_0_1_2",
          facilityid: ALS_FACILITY_ID,
          name: "Beamline 11.0.1.2",
          facilities: { name: ALS_FACILITY },
        },
        {
          id: "nsls-sst1",
          facilityid: NSLS_FACILITY_ID,
          name: "SST1",
          facilities: { name: NSLS_FACILITY },
        },
      ]) as never,
      { limit: 1, offset: 1 },
    );

    expect(page.total).toBe(3);
    expect(page.items.length).toBe(1);
    expect(page.hasMore).toBe(true);
    expect(page.items[0]?.readiness).toBe("not_ready");
    expect(page.items[0]?.instrumentLabel).toBe("Beamline 11.0.1.2");
  });
});
