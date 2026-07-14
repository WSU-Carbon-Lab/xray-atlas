import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  isPendingAttributionWelcomeSearchParams,
  pendingAttributionReviewRedirectUrl,
  pendingAttributionWelcomePath,
} from "~/server/auth/pending-attribution-review-bridge";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("pendingAttributionWelcomePath", () => {
  it("builds a relative path with a real welcome=1 query pair", () => {
    const path = pendingAttributionWelcomePath();
    expect(path).toBe("/account/attributions/pending?welcome=1");
    const parsed = new URL(path, "http://localhost:3000");
    expect(parsed.searchParams.get("welcome")).toBe("1");
    expect(parsed.searchParams.has("welcome=1")).toBe(false);
    expect(path.includes("welcome%3D1")).toBe(false);
  });
});

describe("pendingAttributionReviewRedirectUrl", () => {
  it("builds an absolute URL with welcome as a search key via URLSearchParams", () => {
    const absolute = pendingAttributionReviewRedirectUrl(
      "http://localhost:3000",
    );
    expect(absolute).toBe(
      "http://localhost:3000/account/attributions/pending?welcome=1",
    );
    const parsed = new URL(absolute);
    expect([...parsed.searchParams.entries()]).toEqual([["welcome", "1"]]);
    expect(absolute.includes("welcome%3D1")).toBe(false);
  });

  it("strips a trailing slash on the origin", () => {
    expect(
      pendingAttributionReviewRedirectUrl("http://localhost:3000/"),
    ).toBe("http://localhost:3000/account/attributions/pending?welcome=1");
  });
});

describe("isPendingAttributionWelcomeSearchParams", () => {
  it("accepts welcome=1", () => {
    expect(isPendingAttributionWelcomeSearchParams({ welcome: "1" })).toBe(
      true,
    );
  });

  it("accepts the accidental encoded key welcome=1", () => {
    expect(
      isPendingAttributionWelcomeSearchParams({ "welcome=1": "" }),
    ).toBe(true);
  });

  it("rejects ordinary pending visits", () => {
    expect(isPendingAttributionWelcomeSearchParams({})).toBe(false);
    expect(isPendingAttributionWelcomeSearchParams({ welcome: "0" })).toBe(
      false,
    );
  });
});
