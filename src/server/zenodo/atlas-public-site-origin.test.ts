import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { site } from "~/app/brand";
import {
  buildAtlasExperimentBrowseUrl,
  descriptionContainsLoopbackAtlasUrl,
  descriptionNeedsAtlasCanonicalUrlRepair,
  getAtlasPublicSiteOrigin,
  isLoopbackHostname,
  normalizePublicSiteOrigin,
  rewriteLoopbackAtlasBrowseUrls,
} from "~/server/zenodo/atlas-public-site-origin";
import { buildZenodoDepositMetadata } from "~/server/zenodo/build-zenodo-metadata";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toContain: (expected: string) => void;
  not: {
    toContain: (expected: string) => void;
    toBe: (expected: unknown) => void;
  };
  toThrow: (expected?: string | RegExp) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const EXPERIMENT_ID = "869dcdef-134e-454d-882b-fdcd2596715d";
const MOLECULE_SLUG = "polystyrene";

describe("getAtlasPublicSiteOrigin", () => {
  const previous = process.env.ATLAS_PUBLIC_SITE_URL;

  function restoreEnv(): void {
    if (previous === undefined) {
      delete process.env.ATLAS_PUBLIC_SITE_URL;
    } else {
      process.env.ATLAS_PUBLIC_SITE_URL = previous;
    }
  }

  it("defaults to brand site.url even when AUTH_URL and VERCEL_URL are localhost/preview", () => {
    delete process.env.ATLAS_PUBLIC_SITE_URL;
    const previousAuth = process.env.AUTH_URL;
    const previousVercel = process.env.VERCEL_URL;
    process.env.AUTH_URL = "http://localhost:3000";
    process.env.VERCEL_URL = "xray-atlas-git-feat.vercel.app";
    try {
      expect(getAtlasPublicSiteOrigin()).toBe(site.url.replace(/\/$/, ""));
      expect(getAtlasPublicSiteOrigin()).not.toContain("localhost");
      expect(getAtlasPublicSiteOrigin()).not.toContain("vercel.app");
    } finally {
      if (previousAuth === undefined) {
        delete process.env.AUTH_URL;
      } else {
        process.env.AUTH_URL = previousAuth;
      }
      if (previousVercel === undefined) {
        delete process.env.VERCEL_URL;
      } else {
        process.env.VERCEL_URL = previousVercel;
      }
      restoreEnv();
    }
  });

  it("honors ATLAS_PUBLIC_SITE_URL when it is a public https origin", () => {
    process.env.ATLAS_PUBLIC_SITE_URL = "https://xrayatlas.example/";
    try {
      expect(getAtlasPublicSiteOrigin()).toBe("https://xrayatlas.example");
    } finally {
      restoreEnv();
    }
  });

  it("rejects ATLAS_PUBLIC_SITE_URL set to localhost", () => {
    process.env.ATLAS_PUBLIC_SITE_URL = "http://localhost:3000";
    try {
      expect(() => getAtlasPublicSiteOrigin()).toThrow(/localhost/);
    } finally {
      restoreEnv();
    }
  });
});

describe("buildAtlasExperimentBrowseUrl", () => {
  it("builds molecule deep-links on the public origin", () => {
    expect(
      buildAtlasExperimentBrowseUrl(
        EXPERIMENT_ID,
        MOLECULE_SLUG,
        "https://xrayatlas.wsu.edu",
      ),
    ).toBe(
      `https://xrayatlas.wsu.edu/molecules/${MOLECULE_SLUG}?nexafsExperiment=${EXPERIMENT_ID}`,
    );
  });

  it("slugifies display names used as moleculeSlug", () => {
    expect(
      buildAtlasExperimentBrowseUrl(
        EXPERIMENT_ID,
        "Poly Styrene",
        "https://xrayatlas.wsu.edu",
      ),
    ).toBe(
      `https://xrayatlas.wsu.edu/molecules/poly-styrene?nexafsExperiment=${EXPERIMENT_ID}`,
    );
  });
});

describe("loopback and legacy Atlas URL helpers", () => {
  it("detects localhost browse and molecule links", () => {
    expect(
      descriptionContainsLoopbackAtlasUrl(
        `http://localhost:3000/browse?nexafsExperiment=${EXPERIMENT_ID}`,
      ),
    ).toBe(true);
    expect(
      descriptionContainsLoopbackAtlasUrl(
        `http://localhost:3000/molecules/${MOLECULE_SLUG}?nexafsExperiment=${EXPERIMENT_ID}`,
      ),
    ).toBe(true);
    expect(
      descriptionContainsLoopbackAtlasUrl(
        `https://xrayatlas.wsu.edu/molecules/${MOLECULE_SLUG}?nexafsExperiment=${EXPERIMENT_ID}`,
      ),
    ).toBe(false);
  });

  it("flags legacy public browse links for repair", () => {
    expect(
      descriptionNeedsAtlasCanonicalUrlRepair(
        `https://xrayatlas.wsu.edu/browse?nexafsExperiment=${EXPERIMENT_ID}`,
      ),
    ).toBe(true);
    expect(
      descriptionNeedsAtlasCanonicalUrlRepair(
        `https://xrayatlas.wsu.edu/browse/nexafs?nexafsExperiment=${EXPERIMENT_ID}`,
      ),
    ).toBe(true);
    expect(
      descriptionNeedsAtlasCanonicalUrlRepair(
        `https://xrayatlas.wsu.edu/molecules/${MOLECULE_SLUG}?nexafsExperiment=${EXPERIMENT_ID}`,
      ),
    ).toBe(false);
  });

  it("rewrites localhost experiment links to the public origin", () => {
    const browseInput = `<a href="http://localhost:3000/browse?nexafsExperiment=${EXPERIMENT_ID}">link</a>`;
    expect(
      rewriteLoopbackAtlasBrowseUrls(browseInput, "https://xrayatlas.wsu.edu"),
    ).toBe(
      `<a href="https://xrayatlas.wsu.edu/browse?nexafsExperiment=${EXPERIMENT_ID}">link</a>`,
    );
    const moleculeInput = `<a href="http://localhost:3000/molecules/${MOLECULE_SLUG}?nexafsExperiment=${EXPERIMENT_ID}">link</a>`;
    expect(
      rewriteLoopbackAtlasBrowseUrls(
        moleculeInput,
        "https://xrayatlas.wsu.edu",
      ),
    ).toBe(
      `<a href="https://xrayatlas.wsu.edu/molecules/${MOLECULE_SLUG}?nexafsExperiment=${EXPERIMENT_ID}">link</a>`,
    );
  });

  it("classifies loopback hostnames", () => {
    expect(isLoopbackHostname("localhost")).toBe(true);
    expect(isLoopbackHostname("127.0.0.1")).toBe(true);
    expect(isLoopbackHostname("foo.localhost")).toBe(true);
    expect(isLoopbackHostname("xrayatlas.wsu.edu")).toBe(false);
  });

  it("normalizePublicSiteOrigin strips trailing slash", () => {
    expect(normalizePublicSiteOrigin("https://xrayatlas.wsu.edu/")).toBe(
      "https://xrayatlas.wsu.edu",
    );
  });
});

describe("buildZenodoDepositMetadata public URL", () => {
  it("never embeds localhost when snapshot uses the public molecule deep-link", () => {
    const metadata = buildZenodoDepositMetadata({
      experimentId: EXPERIMENT_ID,
      canonicalSlug: "demo-c-k-tey-1",
      moleculeDisplayName: "Demo",
      moleculeIupacName: "demo",
      moleculeSlug: "demo",
      chemicalFormula: "C",
      edgeTargetAtom: "C",
      edgeCoreState: "K",
      instrumentName: "5.3.2.2",
      facilityName: "ALS",
      experimentTypeLabel: "TEY",
      atlasExperimentUrl: buildAtlasExperimentBrowseUrl(
        EXPERIMENT_ID,
        "demo",
        "https://xrayatlas.wsu.edu",
      ),
      creators: [{ name: "Doe, Jane" }],
      relatedIdentifiers: [],
      sample: {},
    });
    expect(metadata.description).toContain(
      `https://xrayatlas.wsu.edu/molecules/demo?nexafsExperiment=${EXPERIMENT_ID}`,
    );
    expect(metadata.description).not.toContain("/browse?");
    expect(metadata.description).not.toContain("localhost");
  });
});
