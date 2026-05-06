/**
 * Declarative scenario contracts for `NexafsCoreAbsorptionSchematic`: electron shell slots, inbound photon shots,
 * and outbound photoemission vectors. The SVG implementation consumes these records so authors can extend animations
 * without rewriting SMIL wiring; this module deliberately excludes React and rendering details.
 */

/** Stable identifiers for the shipped wiki hero demo; callers may introduce additional ids on custom scenarios. */
export const NexafsCoreDemoElectronIds = {
  ONE_S_IMPACT: "demo-1s-impact",
  ONE_S_PAIRED: "demo-1s-paired",
  TWO_S_A: "demo-2s-a",
  TWO_S_B: "demo-2s-b",
  TWO_P_15: "demo-2p-15",
  TWO_P_55: "demo-2p-55",
  TWO_P_115: "demo-2p-115",
  TWO_P_165: "demo-2p-165",
  TWO_P_265: "demo-2p-265",
  TWO_P_325: "demo-2p-325",
} as const;

/** Stable identifier for the shipped wiki hero primary photon. */
export const NexafsCoreDemoPhotonIds = {
  PRIMARY_CORE_ABSORPTION: "demo-primary-core-absorption",
} as const;

/**
 * Whether an orbital glyph represents a bound carrier drawn as a filled sphere (`bound`) or a promoted /
 * continuum-facing state rendered like an open dashed placeholder (`excited`). The hero SMIL track still owns
 * time-varying excited motion for the targeted electron; this flag fixes **baseline shell styling** before motion layers apply.
 */
export type ElectronExcitationState = "bound" | "excited";

/** Fixed nucleus center and Bohr radii used when projecting polar electron sites into Cartesian SVG space. */
export interface NexafsCoreAbsorptionLayoutScenario {
  readonly nucleusCx: number;
  readonly nucleusCy: number;
  readonly r1s: number;
  readonly r2s: number;
  readonly r2p: number;
}

/** Parameters forwarded into `buildEnvelopeWavePacketPath` for transverse oscillation inside the moving packet group. */
export interface NexafsWavePacketShapeScenario {
  readonly halfLength: number;
  readonly sigma: number;
  readonly amplitude: number;
  readonly k: number;
  readonly envelopePower: number;
  readonly envelopeCutoff: number;
  readonly steps: number;
}

/**
 * Inbound photon geometry: the trajectory begins at `ingressAnchor`, advances along the chord toward the targeted electron's
 * polar position, and spawns the translated wave packet `packetLeadIn` user units **upstream** along that chord (matching the
 * legacy lead-in offset). `wavyGuide` shapes the static reduced-motion polyline only.
 */
export interface PhotonIngressTrajectoryScenario {
  readonly ingressAnchor: { readonly x: number; readonly y: number };
  readonly packetLeadIn: number;
  readonly wavyGuide: { readonly wavelength: number; readonly amplitude: number };
}

/**
 * One photon impulse referencing exactly one **target** electron id (`targetElectronId`) whose polar location defines impact.
 * `emittedElectronId` names which site's configured exit vector drives photoemission streaking (defaults to the target when omitted).
 */
export interface PhotonShotScenario {
  readonly id: string;
  readonly targetElectronId: string;
  readonly emittedElectronId?: string;
  readonly ingress: PhotonIngressTrajectoryScenario;
  readonly wavePacket: NexafsWavePacketShapeScenario;
}

/**
 * Unit outward direction (SVG user space, +x right, +y down) for photoemission originating at the impacted shell coordinate.
 * `chordLen` controls streak length; `arrowInset` trims the arrow marker inset along the same ray (legacy promotion beam styling).
 */
export interface ElectronExitTrajectoryScenario {
  readonly directionUnit: { readonly dx: number; readonly dy: number };
  readonly chordLen: number;
  readonly arrowInset: number;
}

/**
 * Normalized SMIL timeline fractions shared by absorption glow, packet translation, and ejection streak segments.
 * Impact-adjacent cues derive from `photonHitNormalized` using the `*BeforeHit` / `*AfterHit` deltas so retiming the impact
 * automatically slides dependent glow and fade windows together.
 */
export interface NexafsCoreAbsorptionTimingScenario {
  readonly motionDurSeconds: number;
  readonly photonHitNormalized: number;
  readonly photonHoldEndNormalized: number;
  readonly ejectionEndNormalized: number;
  readonly ejectionResetNormalized: number;
  readonly photonToEjectionLagNormalized: number;
  /** Subtract from `photonHitNormalized` to begin fading the transient bound glyph at the impact site. */
  readonly impactElectronFadeLeadBeforeHit: number;
  /** Add to `photonHitNormalized` to finish that fade-out. */
  readonly impactElectronFadeTrailAfterHit: number;
  /** Subtract from `photonHitNormalized` for the first absorption glow keyframe tied to impact staging. */
  readonly absorbGlowStartLeadBeforeHit: number;
  /** Subtract from `photonHitNormalized` so the glow ramp completes just before peak absorption. */
  readonly absorbGlowRampEndLeadBeforeHit: number;
}

/**
 * One discrete electron site on a Bohr shell: polar placement, shell styling paints, stationary excitation label,
 * occupancy for dashed placeholders, and optional omission of the shell glyph while motion replaces it with the transient core glyph.
 */
export interface ElectronSiteScenario {
  readonly id: string;
  readonly radius: number;
  readonly angleDeg: number;
  readonly filledFill: string;
  readonly emptyFill: string;
  readonly emptyStrokeColor: string;
  readonly occupied: boolean;
  readonly excitation: ElectronExcitationState;
  /**
   * When true and the shell motion layer is active for this site's id as `PhotonShotScenario.targetElectronId`, the angle is excluded
   * from `ShellElectrons` so the transient SMIL glyph occupies the slot without double drawing.
   */
  readonly omitShellGlyphDuringMotion?: boolean;
}

export interface NexafsCoreAbsorptionScenario {
  readonly layout: NexafsCoreAbsorptionLayoutScenario;
  readonly electrons: readonly ElectronSiteScenario[];
  readonly primaryPhoton: PhotonShotScenario;
  readonly exitTrajectoriesByElectronId: Readonly<
    Record<string, ElectronExitTrajectoryScenario>
  >;
  readonly timing: NexafsCoreAbsorptionTimingScenario;
}

/**
 * Computes Cartesian coordinates for a polar electron site relative to the scenario nucleus center.
 *
 * @param layout - Nucleus center shared by all sites.
 * @param site - Polar radius and azimuth in degrees (0° = +x axis, clockwise SVG convention).
 */
export function electronSiteCartesian(
  layout: NexafsCoreAbsorptionLayoutScenario,
  site: Pick<ElectronSiteScenario, "radius" | "angleDeg">,
): { readonly x: number; readonly y: number } {
  const rad = (site.angleDeg * Math.PI) / 180;
  return {
    x: layout.nucleusCx + site.radius * Math.cos(rad),
    y: layout.nucleusCy + site.radius * Math.sin(rad),
  };
}

/**
 * Returns the configured electron site or throws if `id` is missing; use at schematic boundaries so typos fail loudly during development.
 *
 * @param scenario - Full scenario carrying the electron catalog.
 * @param id - Stable electron identifier referenced by photon shots or exit maps.
 */
export function requireElectronSite(
  scenario: NexafsCoreAbsorptionScenario,
  id: string,
): ElectronSiteScenario {
  const found = scenario.electrons.find((e) => e.id === id);
  if (!found) {
    throw new Error(`Unknown electron site id "${id}" for NEXAFS core absorption scenario`);
  }
  return found;
}

/**
 * Resolves the outbound vector configuration for an emitted electron id, defaulting lookup to `targetElectronId` when callers omit `emittedElectronId`.
 *
 * @param scenario - Scenario carrying `exitTrajectoriesByElectronId`.
 * @param shot - Photon shot naming target (and optionally distinct emitted) electron ids.
 */
export function resolveExitTrajectoryForShot(
  scenario: NexafsCoreAbsorptionScenario,
  shot: PhotonShotScenario,
): ElectronExitTrajectoryScenario {
  const emittedId = shot.emittedElectronId ?? shot.targetElectronId;
  const exit = scenario.exitTrajectoriesByElectronId[emittedId];
  if (!exit) {
    throw new Error(
      `Missing exit trajectory for electron id "${emittedId}" on photon shot "${shot.id}"`,
    );
  }
  return exit;
}

/** Builds chord endpoints for static promotion beam gradients given impact coordinates and an exit trajectory. */
export function promotionBeamEndpoints(
  impact: { readonly x: number; readonly y: number },
  exit: ElectronExitTrajectoryScenario,
): {
  readonly arrowTipX: number;
  readonly arrowTipY: number;
  readonly arrowBaseX: number;
  readonly arrowBaseY: number;
  readonly travelX: number;
  readonly travelY: number;
} {
  const { directionUnit: u, chordLen, arrowInset } = exit;
  const endX = impact.x + u.dx * chordLen;
  const endY = impact.y + u.dy * chordLen;
  const bx = endX - u.dx * arrowInset;
  const by = endY - u.dy * arrowInset;
  return {
    arrowTipX: endX,
    arrowTipY: endY,
    arrowBaseX: bx,
    arrowBaseY: by,
    travelX: u.dx * chordLen * 0.92,
    travelY: u.dy * chordLen * 0.92,
  };
}

/**
 * Derives beam tangents for wave-packet translation: unit vector from ingress anchor toward impact, packet spawn upstream,
 * and clockwise rotation angle for local packet oscillation axes.
 *
 * @param ingressAnchor - Photon ingress point in SVG user units.
 * @param impact - Target electron Cartesian impact coordinate.
 */
export function beamFrameFromIngressToImpact(
  ingressAnchor: { readonly x: number; readonly y: number },
  impact: { readonly x: number; readonly y: number },
  packetLeadIn: number,
): {
  readonly beamUx: number;
  readonly beamUy: number;
  readonly beamAngleDeg: number;
  readonly packetStartCx: number;
  readonly packetStartCy: number;
} {
  const beamDx = impact.x - ingressAnchor.x;
  const beamDy = impact.y - ingressAnchor.y;
  const beamLen = Math.hypot(beamDx, beamDy);
  const beamUx = beamLen > 1e-6 ? beamDx / beamLen : 1;
  const beamUy = beamLen > 1e-6 ? beamDy / beamLen : 0;
  const beamAngleDeg = (Math.atan2(beamDy, beamDx) * 180) / Math.PI;
  return {
    beamUx,
    beamUy,
    beamAngleDeg,
    packetStartCx: ingressAnchor.x - beamUx * packetLeadIn,
    packetStartCy: ingressAnchor.y - beamUy * packetLeadIn,
  };
}

export type ShellOrbitalGlyphSlot =
  | {
      readonly angleDeg: number;
      readonly variant: "bound-electron";
      readonly filledFill: string;
    }
  | {
      readonly angleDeg: number;
      readonly variant: "unoccupied-slot";
      readonly emptyFill: string;
      readonly emptyStrokeColor: string;
    };

/**
 * Converts declarative electron rows at a single Bohr radius into concrete shell glyphs, omitting targets flagged for motion hand-off.
 *
 * @param scenario - Full scenario; filtered by `radius`.
 * @param radius - Shell radius (`layout.r1s`, `layout.r2s`, or `layout.r2p`).
 * @param motionActive - When true, drops sites that declare `omitShellGlyphDuringMotion` if `photonTargetId` matches their id.
 * @param photonTargetId - Primary photon target used with omission flags.
 */
export function shellOrbitalGlyphsForRadius(
  scenario: NexafsCoreAbsorptionScenario,
  radius: number,
  motionActive: boolean,
  photonTargetId: string,
): ShellOrbitalGlyphSlot[] {
  const slots: ShellOrbitalGlyphSlot[] = [];
  for (const site of scenario.electrons) {
    if (site.radius !== radius) {
      continue;
    }
    if (
      motionActive &&
      site.omitShellGlyphDuringMotion &&
      site.id === photonTargetId
    ) {
      continue;
    }
    const filled =
      site.occupied && site.excitation === "bound"
        ? ({
            angleDeg: site.angleDeg,
            variant: "bound-electron",
            filledFill: site.filledFill,
          } as const)
        : ({
            angleDeg: site.angleDeg,
            variant: "unoccupied-slot",
            emptyFill: site.emptyFill,
            emptyStrokeColor: site.emptyStrokeColor,
          } as const);
    slots.push(filled);
  }
  return slots;
}

const EJECT_ELEVATION_DEG = 59;
const EJECT_PLANE_RAD = (EJECT_ELEVATION_DEG * Math.PI) / 180;
const DEFAULT_EXIT_UNIT = {
  dx: Math.cos(EJECT_PLANE_RAD),
  dy: -Math.sin(EJECT_PLANE_RAD),
} as const;

const HIT_ANGLE_DEG = 218;

/**
 * Default wiki hero scenario reproducing the historic single-photon / single-core-hit choreography (same polar placements,
 * ingress anchor, exit ray, and timing fractions as the pre-refactor inline constants).
 */
export const DEFAULT_NEXAFS_CORE_ABSORPTION_SCENARIO = {
  layout: {
    nucleusCx: 260,
    nucleusCy: 218,
    r1s: 46,
    r2s: 88,
    r2p: 132,
  },
  electrons: [
    {
      id: NexafsCoreDemoElectronIds.ONE_S_IMPACT,
      radius: 46,
      angleDeg: HIT_ANGLE_DEG,
      filledFill: "url(#nexafs-electron-core)",
      emptyFill: "url(#nexafs-unoccupied-slot)",
      emptyStrokeColor: "oklch(72% 0.14 264)",
      occupied: false,
      excitation: "bound",
      omitShellGlyphDuringMotion: true,
    },
    {
      id: NexafsCoreDemoElectronIds.ONE_S_PAIRED,
      radius: 46,
      angleDeg: (HIT_ANGLE_DEG + 180) % 360,
      filledFill: "url(#nexafs-electron-core)",
      emptyFill: "url(#nexafs-unoccupied-slot)",
      emptyStrokeColor: "oklch(72% 0.14 264)",
      occupied: true,
      excitation: "bound",
    },
    {
      id: NexafsCoreDemoElectronIds.TWO_S_A,
      radius: 88,
      angleDeg: 320,
      filledFill: "url(#nexafs-electron-valence)",
      emptyFill: "url(#nexafs-unoccupied-slot)",
      emptyStrokeColor: "oklch(68% 0.08 160)",
      occupied: true,
      excitation: "bound",
    },
    {
      id: NexafsCoreDemoElectronIds.TWO_S_B,
      radius: 88,
      angleDeg: 155,
      filledFill: "url(#nexafs-electron-valence)",
      emptyFill: "url(#nexafs-unoccupied-slot)",
      emptyStrokeColor: "oklch(68% 0.08 160)",
      occupied: true,
      excitation: "bound",
    },
    ...(
      [
        [NexafsCoreDemoElectronIds.TWO_P_15, 15],
        [NexafsCoreDemoElectronIds.TWO_P_55, 55],
        [NexafsCoreDemoElectronIds.TWO_P_115, 115],
        [NexafsCoreDemoElectronIds.TWO_P_165, 165],
        [NexafsCoreDemoElectronIds.TWO_P_265, 265],
        [NexafsCoreDemoElectronIds.TWO_P_325, 325],
      ] as const
    ).map(([id, angleDeg]) => ({
      id,
      radius: 132,
      angleDeg,
      filledFill: "url(#nexafs-electron-covalent)",
      emptyFill: "url(#nexafs-unoccupied-slot)",
      emptyStrokeColor: "oklch(72% 0.12 290)",
      occupied: angleDeg === 115 || angleDeg === 325,
      excitation: "bound" as const,
    })),
  ],
  primaryPhoton: {
    id: NexafsCoreDemoPhotonIds.PRIMARY_CORE_ABSORPTION,
    targetElectronId: NexafsCoreDemoElectronIds.ONE_S_IMPACT,
    ingress: {
      ingressAnchor: { x: 52, y: 52 },
      packetLeadIn: 56,
      wavyGuide: { wavelength: 24, amplitude: 6.5 },
    },
    wavePacket: {
      halfLength: 24,
      sigma: 8.5,
      amplitude: 14.5,
      k: 1.08,
      envelopePower: 3.35,
      envelopeCutoff: 0.042,
      steps: 96,
    },
  },
  exitTrajectoriesByElectronId: {
    [NexafsCoreDemoElectronIds.ONE_S_IMPACT]: {
      directionUnit: DEFAULT_EXIT_UNIT,
      chordLen: 178,
      arrowInset: 14,
    },
  },
  timing: {
    motionDurSeconds: 5,
    photonHitNormalized: 0.46,
    photonHoldEndNormalized: 0.52,
    ejectionEndNormalized: 0.942,
    ejectionResetNormalized: 0.965,
    photonToEjectionLagNormalized: 0.018,
    impactElectronFadeLeadBeforeHit: 0.012,
    impactElectronFadeTrailAfterHit: 0.008,
    absorbGlowStartLeadBeforeHit: 0.032,
    absorbGlowRampEndLeadBeforeHit: 0.008,
  },
} as const satisfies NexafsCoreAbsorptionScenario;
