import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  averageSpectrumEnergyConflictRows,
  applySpectrumEnergyConflictResolution,
  detectSpectrumEnergyConflictGroups,
  formatConflictingDuplicateEnergyMessage,
  formatSpectrumPointsUniqueConstraintMessage,
  hasSpectrumEnergyConflicts,
  isSpectrumPointsEnergyUniqueViolation,
  preflightSpectrumPointsEnergyUniqueness,
  prepareSpectrumPointsForUniqueEnergyInsert,
  spectrumEnergyConflictGroupKey,
  spectrumPointChannelsEqual,
  type SpectrumEnergyKeyedPoint,
} from "./spectrumPointEnergyUniqueness";

type ExpectAssertions = {
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function point(
  energy: number,
  absorption: number,
  extra?: Partial<SpectrumEnergyKeyedPoint>,
): SpectrumEnergyKeyedPoint {
  return { energy, absorption, theta: 55, phi: 0, ...extra };
}

describe("spectrumPointChannelsEqual", () => {
  it("treats matching optional channels as equal and ignores geometry", () => {
    expect(
      spectrumPointChannelsEqual(
        point(280, 1, { beta: 0.1, theta: 55, phi: 0 }),
        point(280, 1, { beta: 0.1, theta: 90, phi: 10 }),
      ),
    ).toEqual(true);
  });

  it("detects differing absorption or optional channels", () => {
    expect(spectrumPointChannelsEqual(point(280, 1), point(280, 2))).toEqual(
      false,
    );
    expect(
      spectrumPointChannelsEqual(
        point(280, 1, { od: 0.5 }),
        point(280, 1, { od: 0.6 }),
      ),
    ).toEqual(false);
    expect(
      spectrumPointChannelsEqual(point(280, 1, { od: 0.5 }), point(280, 1)),
    ).toEqual(false);
  });
});

describe("prepareSpectrumPointsForUniqueEnergyInsert", () => {
  it("returns a copy unchanged when energies are unique", () => {
    const input = [point(280, 1), point(285, 2), point(290, 3)];
    const result = prepareSpectrumPointsForUniqueEnergyInsert(input);
    expect(result).toEqual({
      ok: true,
      points: input,
      collapsedEnergies: [],
    });
    expect(result.ok && result.points !== input).toEqual(true);
  });

  it("collapses identical duplicate energies with last-wins order preserved", () => {
    const input = [
      point(280, 1),
      point(285, 2),
      point(280, 1),
      point(290, 3),
      point(285, 2),
    ];
    const result = prepareSpectrumPointsForUniqueEnergyInsert(input);
    expect(result).toEqual({
      ok: true,
      points: [point(280, 1), point(290, 3), point(285, 2)],
      collapsedEnergies: [280, 285],
    });
  });

  it("reports conflicting duplicate energies without collapsing", () => {
    const result = prepareSpectrumPointsForUniqueEnergyInsert([
      point(280, 1),
      point(285, 2),
      point(280, 1.5),
    ]);
    expect(result).toEqual({
      ok: false,
      conflictingEnergies: [280],
    });
  });

  it("reports conflict when optional channels differ at the same energy", () => {
    const result = prepareSpectrumPointsForUniqueEnergyInsert([
      point(280, 1, { beta: 0.1 }),
      point(280, 1, { beta: 0.2 }),
    ]);
    expect(result).toEqual({
      ok: false,
      conflictingEnergies: [280],
    });
  });
});

describe("detectSpectrumEnergyConflictGroups", () => {
  it("groups conflicts by geometry and energy with row indices", () => {
    const points = [
      point(304.95, 0.1, { theta: 210, phi: 0 }),
      point(304.95, 0.2, { theta: 210, phi: 0 }),
      point(304.98, 0.3, { theta: 210, phi: 0 }),
      point(304.98, 0.4, { theta: 210, phi: 0 }),
      point(280, 1, { theta: 55, phi: 0 }),
      point(280, 2, { theta: 55, phi: 0 }),
    ];

    const groups = detectSpectrumEnergyConflictGroups(points);
    expect(groups.length).toEqual(3);
    expect(groups[0]).toEqual({
      theta: 55,
      phi: 0,
      energy: 280,
      rows: [
        { pointIndex: 4, absorption: 1 },
        { pointIndex: 5, absorption: 2 },
      ],
    });
    expect(groups[1]?.energy).toEqual(304.95);
    expect(groups[1]?.rows.length).toEqual(2);
    expect(hasSpectrumEnergyConflicts(points)).toEqual(true);
  });

  it("ignores identical duplicate energies", () => {
    const points = [point(280, 1), point(280, 1), point(285, 2)];
    expect(detectSpectrumEnergyConflictGroups(points)).toEqual([]);
    expect(hasSpectrumEnergyConflicts(points)).toEqual(false);
  });
});

describe("preflightSpectrumPointsEnergyUniqueness", () => {
  it("auto-collapses identical duplicates across geometries", () => {
    const points = [
      point(280, 1, { theta: 55, phi: 0 }),
      point(280, 1, { theta: 55, phi: 0 }),
      point(285, 2, { theta: 90, phi: 0 }),
    ];
    const result = preflightSpectrumPointsEnergyUniqueness(points);
    expect(result).toEqual({
      ok: true,
      points: [
        point(280, 1, { theta: 55, phi: 0 }),
        point(285, 2, { theta: 90, phi: 0 }),
      ],
      collapsedCount: 1,
    });
  });

  it("returns conflicts without mutating rows", () => {
    const points = [
      point(304.95, 0.1, { theta: 210, phi: 0 }),
      point(304.95, 0.2, { theta: 210, phi: 0 }),
    ];
    const result = preflightSpectrumPointsEnergyUniqueness(points);
    expect(result.ok).toEqual(false);
    if (!result.ok) {
      expect(result.conflicts.length).toEqual(1);
      expect(result.conflicts[0]?.energy).toEqual(304.95);
    }
  });
});

describe("applySpectrumEnergyConflictResolution", () => {
  it("keeps the selected row and collapses identical duplicates afterward", () => {
    const points = [
      point(304.95, 0.1, { theta: 210, phi: 0 }),
      point(304.95, 0.2, { theta: 210, phi: 0 }),
      point(304.95, 0.2, { theta: 210, phi: 0 }),
    ];
    const key = spectrumEnergyConflictGroupKey(210, 0, 304.95);
    const resolved = applySpectrumEnergyConflictResolution(
      points,
      new Map([[key, { kind: "keep-row", pointIndex: 2 }]]),
    );
    expect(resolved).toEqual([point(304.95, 0.2, { theta: 210, phi: 0 })]);
  });

  it("replaces a conflict group with one averaged row", () => {
    const points = [
      point(304.95, 0.1, {
        theta: 210,
        phi: 0,
        od: 0.3,
        massabsorption: 1.5,
        beta: 2,
      }),
      point(304.95, 0.5, {
        theta: 210,
        phi: 0,
        od: 0.7,
        massabsorption: undefined,
        beta: 4,
      }),
      point(307, 0.9, { theta: 210, phi: 0 }),
    ];
    const key = spectrumEnergyConflictGroupKey(210, 0, 304.95);
    const resolved = applySpectrumEnergyConflictResolution(
      points,
      new Map([[key, { kind: "average" }]]),
    );
    expect(resolved).toEqual([
      point(304.95, 0.3, {
        theta: 210,
        phi: 0,
        od: 0.5,
        massabsorption: 1.5,
        beta: 3,
      }),
      point(307, 0.9, { theta: 210, phi: 0 }),
    ]);
  });
});

describe("averageSpectrumEnergyConflictRows", () => {
  it("averages only finite channel values and keeps the conflict identity", () => {
    const averaged = averageSpectrumEnergyConflictRows([
      point(280, 1, {
        theta: 55,
        phi: 0,
        i0: 2,
        od: 4,
        rawabsError: 0.1,
        beta: 6,
      }),
      point(280, 3, {
        theta: 55,
        phi: 0,
        i0: undefined,
        od: Number.NaN,
        rawabsError: 0.3,
        beta: 10,
      }),
      point(280, 5, {
        theta: 55,
        phi: 0,
        i0: 8,
        od: 10,
        rawabsError: undefined,
        beta: undefined,
      }),
    ]);

    expect(averaged).toEqual(
      point(280, 3, {
        theta: 55,
        phi: 0,
        i0: 5,
        od: 7,
        rawabsError: 0.2,
        beta: 8,
      }),
    );
  });
});

describe("formatConflictingDuplicateEnergyMessage", () => {
  it("lists energies and geometry for contributors", () => {
    const message = formatConflictingDuplicateEnergyMessage(
      { theta: 55, phi: 0 },
      [290, 280],
    );
    expect(message.includes("theta=55 deg")).toEqual(true);
    expect(message.includes("phi=0 deg")).toEqual(true);
    expect(message.includes("280, 290")).toEqual(true);
    expect(message.includes("only once per polarization")).toEqual(true);
  });
});

describe("isSpectrumPointsEnergyUniqueViolation", () => {
  it("matches Prisma P2002 on the spectrum energy unique fields", () => {
    expect(
      isSpectrumPointsEnergyUniqueViolation({
        code: "P2002",
        meta: {
          target: ["experimentid", "polarizationid", "energyev"],
        },
      }),
    ).toEqual(true);
  });

  it("rejects unrelated errors", () => {
    expect(isSpectrumPointsEnergyUniqueViolation(new Error("nope"))).toEqual(
      false,
    );
    expect(
      isSpectrumPointsEnergyUniqueViolation({
        code: "P2002",
        meta: { target: ["email"] },
      }),
    ).toEqual(false);
  });
});

describe("formatSpectrumPointsUniqueConstraintMessage", () => {
  it("avoids raw Prisma wording", () => {
    const message = formatSpectrumPointsUniqueConstraintMessage();
    expect(message.includes("photon energy")).toEqual(true);
    expect(message.toLowerCase().includes("prisma")).toEqual(false);
  });
});
