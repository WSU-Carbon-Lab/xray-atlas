import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import type { NexafsBrowseGroup } from "~/components/browse/nexafs-browse-map-group";
import {
  catalogMetaFallback,
  catalogMetaFromBrowseGroup,
  plotViewerExperimentGroupLabel,
  plotViewerExperimentLabelFromMeta,
} from "./plot-viewer-catalog-meta";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function mockGroup(overrides?: Partial<NexafsBrowseGroup>): NexafsBrowseGroup {
  return {
    experimentId: "12d5b864-bf0d-423a-9004-82d8cd6e140c",
    molecule: {
      id: "mol-1",
      displayName: "Y6",
      chemicalformula: "C82H54N8O2S4",
      slug: "y6",
    },
    edge: {
      id: "edge-1",
      targetatom: "C",
      corestate: "K",
    },
    instrument: {
      id: "inst-1",
      name: "Beamline SXR",
      facilityName: "ALS",
    },
    polarizationCount: 2,
    favoriteCount: 0,
    userHasFavorited: false,
    publicationCount: 0,
    ...overrides,
  } as NexafsBrowseGroup;
}

describe("plotViewerExperimentGroupLabel", () => {
  it("formats molecule, edge, and abbreviated instrument like browse labels", () => {
    expect(plotViewerExperimentGroupLabel(mockGroup())).toBe("Y6 · C K · SXR");
  });
});

describe("catalogMetaFromBrowseGroup", () => {
  it("stores abbreviated instrument names for descriptor columns", () => {
    expect(catalogMetaFromBrowseGroup(mockGroup()).instrumentName).toBe("SXR");
  });
});

describe("plotViewerExperimentLabelFromMeta", () => {
  it("joins non-empty metadata segments", () => {
    expect(
      plotViewerExperimentLabelFromMeta(
        catalogMetaFromBrowseGroup(mockGroup()),
        mockGroup().experimentId,
      ),
    ).toBe("Y6 · C K · SXR");
  });

  it("falls back to a short id prefix when metadata is missing", () => {
    const experimentId = "12d5b864-bf0d-423a-9004-82d8cd6e140c";
    expect(plotViewerExperimentLabelFromMeta(undefined, experimentId)).toBe(
      "12d5b864",
    );
    expect(
      plotViewerExperimentLabelFromMeta(
        catalogMetaFallback(experimentId),
        experimentId,
      ),
    ).toBe("12d5b864");
  });
});
