import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { site } from "~/app/brand";
import {
  ATLAS_COLLECTION_DOI,
  buildDatabaseCitation,
  buildDatasetBibTeX,
  buildDatasetCitation,
  buildDatasetCitationBundle,
  buildDatasetDataAvailabilityStatement,
  buildDatasetInTextCitation,
  buildDatasetInTextExample,
  buildMendeleyImportUrl,
  buildNexafsDatasetCitationTitle,
  buildZoteroSaveUrl,
  formatApaReferenceAuthor,
  formatCitationAccessDate,
  formatDatasetCitationSampleSummary,
  formatDoiCitationUrl,
} from "~/lib/dataset-citation";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeNull: () => void;
  toContain: (expected: string) => void;
  not: {
    toContain: (expected: string) => void;
  };
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("buildNexafsDatasetCitationTitle", () => {
  it("uses formal comma-separated title without @", () => {
    expect(
      buildNexafsDatasetCitationTitle({
        moleculeDisplayName: "Polystyrene",
        edgeLabel: "C(K)",
        instrumentName: "5.3.2.2",
        facilityName: "ALS",
        experimentTypeLabel: "TEY",
      }),
    ).toBe("NEXAFS dataset: Polystyrene, C(K), TEY, 5.3.2.2, ALS");
  });

  it("omits facility and type when absent", () => {
    expect(
      buildNexafsDatasetCitationTitle({
        moleculeDisplayName: "Polystyrene",
        edgeLabel: "C K",
        instrumentName: "Beamline 1",
      }),
    ).toBe("NEXAFS dataset: Polystyrene, C K, Beamline 1");
  });
});

describe("formatDoiCitationUrl", () => {
  it("normalizes prefixed DOIs", () => {
    expect(formatDoiCitationUrl("https://doi.org/10.5281/zenodo.1")).toBe(
      "https://doi.org/10.5281/zenodo.1",
    );
  });

  it("returns null for empty input", () => {
    expect(formatDoiCitationUrl(null)).toBeNull();
    expect(formatDoiCitationUrl("  ")).toBeNull();
  });
});

describe("buildZoteroSaveUrl", () => {
  it("encodes the doi.org URL as the Zotero save query", () => {
    expect(buildZoteroSaveUrl("10.5281/zenodo.123")).toBe(
      `https://www.zotero.org/save?q=${encodeURIComponent("https://doi.org/10.5281/zenodo.123")}`,
    );
  });

  it("returns null without a DOI", () => {
    expect(buildZoteroSaveUrl(null)).toBeNull();
    expect(buildZoteroSaveUrl("")).toBeNull();
  });
});

describe("buildMendeleyImportUrl", () => {
  it("passes the bare DOI to the Mendeley import endpoint", () => {
    expect(buildMendeleyImportUrl("https://doi.org/10.5281/zenodo.123")).toBe(
      `https://www.mendeley.com/import/?doi=${encodeURIComponent("10.5281/zenodo.123")}`,
    );
  });

  it("returns null without a DOI", () => {
    expect(buildMendeleyImportUrl(null)).toBeNull();
  });
});

describe("formatApaReferenceAuthor", () => {
  it("converts Given Family to Family, G.", () => {
    expect(formatApaReferenceAuthor("Jane Doe")).toBe("Doe, J.");
  });

  it("preserves Family, Given input", () => {
    expect(formatApaReferenceAuthor("Doe, Jane")).toBe("Doe, J.");
  });
});

describe("buildDatasetInTextCitation", () => {
  it("uses et al. for three or more authors", () => {
    expect(
      buildDatasetInTextCitation(["Jane Doe", "John Smith", "Ada Lee"], 2026),
    ).toBe("(Doe et al., 2026)");
  });

  it("joins two authors with ampersand", () => {
    expect(buildDatasetInTextCitation(["Jane Doe", "John Smith"], 2026)).toBe(
      "(Doe & Smith, 2026)",
    );
  });
});

describe("buildDatasetInTextExample", () => {
  it("embeds molecule, host, and parenthetical citation", () => {
    expect(
      buildDatasetInTextExample("PC61BM", "(Collins et al., 2026)"),
    ).toBe(
      "NEXAFS spectra for PC61BM were obtained from the X-ray Atlas (Collins et al., 2026).",
    );
  });
});

describe("buildDatasetCitation", () => {
  it("builds APA-like dataset reference with DOI and adapted-from", () => {
    const text = buildDatasetCitation({
      moleculeDisplayName: "Polystyrene",
      edgeLabel: "C(K)",
      instrumentName: "5.3.2.2",
      facilityName: "ALS",
      experimentTypeLabel: "TEY",
      datasetDoi: "10.5281/zenodo.99",
      creators: ["Jane Doe", "John Smith"],
      year: 2026,
      sourcePublications: [
        { doi: "10.1021/example", title: "Example Paper" },
      ],
    });
    expect(text).toBe(
      "Doe, J., & Smith, J. (2026). NEXAFS dataset: Polystyrene, C(K), TEY, 5.3.2.2, ALS [Dataset]. X-ray Atlas. https://doi.org/10.5281/zenodo.99 (DOI minted via Zenodo). Adapted from Example Paper (https://doi.org/10.1021/example).",
    );
  });

  it("omits DOI and adapted-from when missing", () => {
    const text = buildDatasetCitation({
      moleculeDisplayName: "Polystyrene",
      edgeLabel: "C(K)",
      instrumentName: "5.3.2.2",
      datasetDoi: null,
      creators: ["Jane Doe"],
      year: 2026,
    });
    expect(text).toBe(
      "Doe, J. (2026). NEXAFS dataset: Polystyrene, C(K), 5.3.2.2 [Dataset]. X-ray Atlas.",
    );
  });
});

describe("buildDatasetDataAvailabilityStatement", () => {
  it("frames Atlas as primary home and Zenodo as DOI mint", () => {
    const text = buildDatasetDataAvailabilityStatement({
      moleculeDisplayName: "Polystyrene",
      edgeLabel: "C(K)",
      instrumentName: "5.3.2.2",
      datasetDoi: "10.5281/zenodo.99",
    });
    expect(text).toBe(
      "NEXAFS datasets are openly available on X-ray Atlas. Persistent DOIs for Atlas datasets are minted via Zenodo. NEXAFS dataset: Polystyrene, C(K), 5.3.2.2 is available at https://doi.org/10.5281/zenodo.99 (CC BY 4.0).",
    );
    expect(text).not.toContain('NEXAFS dataset "NEXAFS dataset:');
  });

  it("notes pending DOI mint without doubled title wrapper", () => {
    const text = buildDatasetDataAvailabilityStatement({
      moleculeDisplayName: "Polystyrene",
      edgeLabel: "C(K)",
      instrumentName: "5.3.2.2",
      datasetDoi: null,
    });
    expect(text).toBe(
      "NEXAFS datasets are openly available on X-ray Atlas. A persistent DOI for NEXAFS dataset: Polystyrene, C(K), 5.3.2.2 is pending minting via Zenodo.",
    );
    expect(text).not.toContain('NEXAFS dataset "NEXAFS dataset:');
  });
});

describe("formatDatasetCitationSampleSummary", () => {
  it("joins populated sample fields into a Sample clause", () => {
    expect(
      formatDatasetCitationSampleSummary({
        processMethod: "Solvent",
        substrate: "Si",
        patterningLayer: "photoresist",
        solvent: "chloroform",
        thicknessNm: 50,
        molecularWeightGPerMol: 10000.5,
        vendorName: "Sigma-Aldrich",
      }),
    ).toBe(
      "Sample: process Solvent; substrate Si; patterning layer photoresist; solvent chloroform; thickness 50 nm; molecular weight 10000.5 g/mol; vendor Sigma-Aldrich",
    );
  });

  it("returns null when no sample fields are present", () => {
    expect(formatDatasetCitationSampleSummary({})).toBeNull();
    expect(formatDatasetCitationSampleSummary(null)).toBeNull();
  });
});

describe("buildDatasetBibTeX", () => {
  it("emits @dataset with author title year publisher doi and Atlas note", () => {
    const text = buildDatasetBibTeX({
      moleculeDisplayName: "Polystyrene",
      edgeLabel: "C(K)",
      instrumentName: "5.3.2.2",
      facilityName: "ALS",
      datasetDoi: "10.5281/zenodo.99",
      creators: ["Jane Doe"],
      year: 2026,
    });
    expect(text).toContain("@dataset{");
    expect(text).toContain("author    = {Doe, Jane}");
    expect(text).toContain(
      "title     = {NEXAFS dataset: Polystyrene, C(K), 5.3.2.2, ALS}",
    );
    expect(text).toContain("year      = {2026}");
    expect(text).toContain("publisher = {X-ray Atlas}");
    expect(text).toContain("doi       = {10.5281/zenodo.99}");
    expect(text).toContain(
      "note      = {X-ray Atlas NEXAFS dataset; DOI minted via Zenodo}",
    );
  });

  it("appends sample preparation details to the BibTeX note", () => {
    const text = buildDatasetBibTeX({
      moleculeDisplayName: "Polystyrene",
      edgeLabel: "C(K)",
      instrumentName: "5.3.2.2",
      datasetDoi: "10.5281/zenodo.99",
      creators: ["Jane Doe"],
      year: 2026,
      sample: {
        processMethod: "Solvent",
        substrate: "Si wafer",
        patterningLayer: "photoresist",
        thicknessNm: 40,
        vendorName: "Sigma-Aldrich",
      },
    });
    expect(text).toContain(
      "note      = {X-ray Atlas NEXAFS dataset; DOI minted via Zenodo; Sample: process Solvent; substrate Si wafer; patterning layer photoresist; thickness 40 nm; vendor Sigma-Aldrich}",
    );
  });
});

describe("buildDatasetCitationBundle", () => {
  it("returns all cite popover fragments including in-text example", () => {
    const bundle = buildDatasetCitationBundle({
      moleculeDisplayName: "Polystyrene",
      edgeLabel: "C(K)",
      instrumentName: "5.3.2.2",
      datasetDoi: "10.5281/zenodo.99",
      creators: ["Jane Doe", "John Smith", "Ada Lee"],
      year: 2026,
    });
    expect(bundle.inText).toBe("(Doe et al., 2026)");
    expect(bundle.inTextExample).toBe(
      "NEXAFS spectra for Polystyrene were obtained from the X-ray Atlas (Doe et al., 2026).",
    );
    expect(bundle.reference).toContain("[Dataset]");
    expect(bundle.reference).toContain("DOI minted via Zenodo");
    expect(bundle.dataAvailability).toContain("doi.org");
    expect(bundle.dataAvailability).toContain(site.name);
    expect(bundle.bibtex).toContain("@dataset{");
  });
});

describe("buildDatabaseCitation", () => {
  it("omits collection DOI when none is configured", () => {
    expect(ATLAS_COLLECTION_DOI).toBeNull();
    const text = buildDatabaseCitation({
      accessedAt: new Date(Date.UTC(2026, 6, 10)),
    });
    expect(text).toBe(`${site.name}. Accessed 2026-07-10.`);
  });

  it("includes collection DOI when provided", () => {
    const text = buildDatabaseCitation({
      accessedAt: new Date(Date.UTC(2026, 6, 10)),
      collectionDoi: "10.5281/zenodo.collection",
    });
    expect(text).toBe(
      `${site.name} https://doi.org/10.5281/zenodo.collection. Accessed 2026-07-10.`,
    );
  });
});

describe("formatCitationAccessDate", () => {
  it("formats UTC calendar date", () => {
    expect(formatCitationAccessDate(new Date(Date.UTC(2026, 0, 5)))).toBe(
      "2026-01-05",
    );
  });
});
