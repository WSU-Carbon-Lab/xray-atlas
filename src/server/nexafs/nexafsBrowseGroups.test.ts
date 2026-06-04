/**
 * Unit tests for `buildNexafsBrowseWhereSql`.
 *
 * The function returns a `Prisma.Sql` tagged-template object. We inspect
 * `.strings` (static SQL fragments) joined into a lowercase string, and
 * `.values` (bound parameters) to verify the correct conditions are emitted
 * without exercising a live database connection.
 */

import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import type { Prisma } from "~/prisma/client";
import { buildNexafsBrowseWhereSql } from "./nexafsBrowseGroups";

type Matchers = {
  toBe: (expected: unknown) => void;
  toContain: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
  not: {
    toContain: (expected: unknown) => void;
  };
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => Matchers;

const UUID_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const UUID_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const UUID_C = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const ORCID_A = "0000-0001-2345-6789";
const ORCID_B = "0000-0002-3456-7890";

function staticFragments(sql: Prisma.Sql): string {
  return sql.strings.join("").toLowerCase();
}

describe("buildNexafsBrowseWhereSql", () => {
  it("returns TRUE when no filters and no search query are provided", () => {
    const result = buildNexafsBrowseWhereSql({}, null);
    expect(staticFragments(result)).toBe("true");
    expect(result.values).toHaveLength(0);
  });

  it("adds a single equality clause for one edgeId (legacy singleton)", () => {
    const result = buildNexafsBrowseWhereSql({ edgeId: UUID_A }, null);
    const frags = staticFragments(result);
    expect(frags).toContain("e.edgeid =");
    expect(frags).not.toContain("any(array[");
    expect(result.values).toContain(UUID_A);
  });

  it("adds a single equality clause for edgeIds with one element", () => {
    const result = buildNexafsBrowseWhereSql({ edgeIds: [UUID_A] }, null);
    const frags = staticFragments(result);
    expect(frags).toContain("e.edgeid =");
    expect(frags).not.toContain("any(array[");
    expect(result.values).toContain(UUID_A);
  });

  it("adds an ANY(ARRAY[...]) clause for edgeIds with multiple elements", () => {
    const result = buildNexafsBrowseWhereSql({ edgeIds: [UUID_A, UUID_B] }, null);
    const frags = staticFragments(result);
    expect(frags).toContain("any(array[");
    expect(result.values).toContain(UUID_A);
    expect(result.values).toContain(UUID_B);
  });

  it("adds single equality for one instrumentId (legacy singleton)", () => {
    const result = buildNexafsBrowseWhereSql({ instrumentId: "inst-1" }, null);
    const frags = staticFragments(result);
    expect(frags).toContain("e.instrumentid =");
    expect(frags).not.toContain("any(array[");
    expect(result.values).toContain("inst-1");
  });

  it("adds ANY(ARRAY[...]) for multiple instrumentIds", () => {
    const result = buildNexafsBrowseWhereSql({ instrumentIds: ["inst-1", "inst-2"] }, null);
    const frags = staticFragments(result);
    expect(frags).toContain("any(array[");
    expect(result.values).toContain("inst-1");
    expect(result.values).toContain("inst-2");
  });

  it("adds a moleculeid equality for single moleculeId (legacy singleton)", () => {
    const result = buildNexafsBrowseWhereSql({ moleculeId: UUID_C }, null);
    const frags = staticFragments(result);
    expect(frags).toContain("s.moleculeid =");
    expect(frags).not.toContain("any(array[");
    expect(result.values).toContain(UUID_C);
  });

  it("adds ANY(ARRAY[...]) for multiple moleculeIds", () => {
    const result = buildNexafsBrowseWhereSql({ moleculeIds: [UUID_A, UUID_C] }, null);
    const frags = staticFragments(result);
    expect(frags).toContain("s.moleculeid = any(array[");
    expect(result.values).toContain(UUID_A);
    expect(result.values).toContain(UUID_C);
  });

  it("adds EXISTS with single orcid_id for one contributorOrcid", () => {
    const result = buildNexafsBrowseWhereSql({ contributorOrcids: [ORCID_A] }, null);
    const frags = staticFragments(result);
    expect(frags).toContain("exists");
    expect(frags).toContain("ecf.orcid_id =");
    expect(frags).not.toContain("any(array[");
    expect(result.values).toContain(ORCID_A);
  });

  it("adds EXISTS with ANY(ARRAY[...]) for multiple contributorOrcids", () => {
    const result = buildNexafsBrowseWhereSql({ contributorOrcids: [ORCID_A, ORCID_B] }, null);
    const frags = staticFragments(result);
    expect(frags).toContain("exists");
    expect(frags).toContain("any(array[");
    expect(result.values).toContain(ORCID_A);
    expect(result.values).toContain(ORCID_B);
  });

  it("normalizes legacy contributorUserId singleton to single EXISTS clause", () => {
    const result = buildNexafsBrowseWhereSql({ contributorUserId: ORCID_A }, null);
    const frags = staticFragments(result);
    expect(frags).toContain("exists");
    expect(frags).toContain("ecf.orcid_id =");
    expect(result.values).toContain(ORCID_A);
  });

  it("combines edge AND instrument as AND conjunction (multi-field)", () => {
    const result = buildNexafsBrowseWhereSql(
      { edgeIds: [UUID_A], instrumentIds: ["inst-1"] },
      null,
    );
    const frags = staticFragments(result);
    expect(frags).toContain("e.edgeid =");
    expect(frags).toContain("e.instrumentid =");
    expect(result.values).toContain(UUID_A);
    expect(result.values).toContain("inst-1");
  });

  it("includes a full-text search condition when searchQuery is provided", () => {
    const result = buildNexafsBrowseWhereSql({}, "carbon");
    const frags = staticFragments(result);
    expect(frags).toContain("ilike");
  });

  it("combines edge filter AND search query with AND join", () => {
    const result = buildNexafsBrowseWhereSql({ edgeIds: [UUID_A] }, "benzene");
    const frags = staticFragments(result);
    expect(frags).toContain("e.edgeid =");
    expect(frags).toContain("ilike");
  });

  it("produces no conditions when all array fields are empty", () => {
    const result = buildNexafsBrowseWhereSql(
      { edgeIds: [], moleculeIds: [], instrumentIds: [], contributorOrcids: [] },
      null,
    );
    expect(staticFragments(result)).toBe("true");
  });
});
