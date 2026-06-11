import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { mergePubChemCandidatesForComponents } from "./structure-lookup-pubchem";

type ExpectAssertions = {
  toHaveLength: (expected: number) => void;
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (
  name: string,
  fn: () => void | Promise<void>,
) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("mergePubChemCandidatesForComponents", () => {
  it("dedupes candidates returned from multiple component queries", () => {
    const seen: string[] = [];
    return mergePubChemCandidatesForComponents(
      async ({ query }) => {
        seen.push(query);
        if (query === "c1ccccc1") {
          return {
            candidates: [{ cid: "241", title: "Benzene", formula: "C6H6" }],
          };
        }
        return {
          candidates: [
            { cid: "241", title: "Benzene", formula: "C6H6" },
            { cid: "999", title: "Other", formula: "C6H6" },
          ],
        };
      },
      "c1ccccc1",
      [
        { role: "full", smiles: "c1ccccc1", label: "Full structure" },
        { role: "repeat_unit", smiles: "CC", label: "Repeat unit" },
      ],
    ).then((merged) => {
      expect(merged).toHaveLength(2);
      expect(seen.length).toBe(2);
    });
  });
});
