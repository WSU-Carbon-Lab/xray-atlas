/**
 * NEXAFS-focused illustration primitives for education surfaces such as the NEXAFS wiki.
 * Optional SMIL motion layers pause off-screen or when the tab is hidden; honors reduced-motion preferences.
 */

"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { cn } from "@heroui/styles";

import {
  beamFrameFromIngressToImpact,
  DEFAULT_NEXAFS_CORE_ABSORPTION_SCENARIO,
  electronSiteCartesian,
  promotionBeamEndpoints,
  requireElectronSite,
  resolveExitTrajectoryForShot,
  shellOrbitalGlyphsForRadius,
  type NexafsCoreAbsorptionScenario,
  type ShellOrbitalGlyphSlot,
} from "~/components/nexafs/nexafs-core-absorption-scenario";

export type {
  ElectronExcitationState,
  ElectronExitTrajectoryScenario,
  ElectronSiteScenario,
  NexafsCoreAbsorptionScenario,
  NexafsCoreAbsorptionLayoutScenario,
  NexafsCoreAbsorptionTimingScenario,
  NexafsWavePacketShapeScenario,
  PhotonIngressTrajectoryScenario,
  PhotonShotScenario,
  ShellOrbitalGlyphSlot,
} from "~/components/nexafs/nexafs-core-absorption-scenario";

export {
  DEFAULT_NEXAFS_CORE_ABSORPTION_SCENARIO,
  beamFrameFromIngressToImpact,
  electronSiteCartesian,
  NexafsCoreDemoElectronIds,
  NexafsCoreDemoPhotonIds,
  promotionBeamEndpoints,
  requireElectronSite,
  resolveExitTrajectoryForShot,
  shellOrbitalGlyphsForRadius,
} from "~/components/nexafs/nexafs-core-absorption-scenario";

function subscribeReducedMotion(onStoreChange: () => void): () => void {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot(): boolean {
  return false;
}

function useReducedMotionPreference(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

type NexafsCoreAbsorptionSchematicProps = {
  /**
   * Optional Tailwind classes merged onto the responsive SVG wrapper (`className` replaces defaults where overlapping specificity applies via cn upstream).
   */
  className?: string;
  /**
   * `hero` expands the SVG beyond `max-w-xl`, omits the staged vignette plate so the diagram sits on the page background, and reserves vertical space for forthcoming motion on wiki-style landing surfaces. Responsive `@sm`/`@lg` tiers assume a nearest Tailwind `@container` ancestor (the wiki home header provides one).
   */
  presentation?: "standard" | "hero";
  /**
   * When true (default for `presentation="hero"`), runs the looping photon and ejected-electron SMIL animation while the figure intersects the viewport and the document tab is visible.
   */
  animated?: boolean;
  /**
   * Overrides electron catalog, photon ingress trajectory (`PhotonIngressTrajectoryScenario`), per-electron exit directions (`ElectronExitTrajectoryScenario`),
   * and SMIL timing fractions (`NexafsCoreAbsorptionTimingScenario`). Defaults to `DEFAULT_NEXAFS_CORE_ABSORPTION_SCENARIO`.
   */
  scenario?: NexafsCoreAbsorptionScenario;
};

/**
 * Draws a Bohr-style schematic of tunable photon absorption at a core site. With motion enabled, a compact
 * purple wave packet (phase-animated) travels inward, a calm core electron sits at the 1s site until impact,
 * then an excited electron carries bloom outward; static fallback keeps stroked ray guides for reduced-motion viewers.
 *
 * @param props.className - Extra layout tokens around the intrinsic-ratio SVG viewport (`width`/`height` scale uniformly via CSS).
 * @param props.presentation - `hero` uses larger bounded height, no `max-w-xl`, and no vignette stage rect so content blends with the host background; defaults to `standard`.
 *
 * **Semantics:** Compresses multi-electron structure into labeled shells (1s solid, 2s solid, 2p dashed).
 * Decorative gradients and glow are non-quantitative cues only.
 *
 * **Accessibility:** Exposes an SVG `<title>` summarizing the schematic for assistive technologies.
 *
 * @param props.animated - Overrides auto-enable (`hero` defaults to animated).
 * @param props.scenario - Authoritative electron catalog, photon shot (`primaryPhoton`), exit vectors (`exitTrajectoriesByElectronId`), and timing; defaults to `DEFAULT_NEXAFS_CORE_ABSORPTION_SCENARIO`.
 */
export function NexafsCoreAbsorptionSchematic({
  className,
  presentation = "standard",
  animated: animatedProp,
  scenario: scenarioProp,
}: NexafsCoreAbsorptionSchematicProps) {
  const animated = animatedProp ?? presentation === "hero";
  const reducedMotion = useReducedMotionPreference();
  const [motionLayerMounted, setMotionLayerMounted] = useState(false);
  useEffect(() => {
    setMotionLayerMounted(true);
  }, []);
  const runMotion = animated && !reducedMotion && motionLayerMounted;
  const motionSvgRef = useRef<SVGSVGElement>(null);
  const figureRef = useRef<HTMLElement | null>(null);
  const intersectingRef = useRef(false);
  const wavePhaseRef = useRef(0);
  const [, setWaveFrame] = useState(0);

  useEffect(() => {
    const svg = motionSvgRef.current;
    const fig = figureRef.current;
    if (!svg || !fig || !runMotion) {
      return;
    }

    const syncPlayback = (): void => {
      if (
        document.visibilityState === "hidden" ||
        !intersectingRef.current
      ) {
        svg.pauseAnimations();
      } else {
        svg.unpauseAnimations();
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        intersectingRef.current = entries.some((e) => e.isIntersecting);
        syncPlayback();
      },
      { root: null, rootMargin: "48px 0px", threshold: 0.08 },
    );
    observer.observe(fig);

    const onVisibility = (): void => {
      syncPlayback();
    };

    document.addEventListener("visibilitychange", onVisibility);

    intersectingRef.current = false;
    svg.pauseAnimations();

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [runMotion]);

  useEffect(() => {
    if (!runMotion) {
      return;
    }
    let frameId = 0;
    let alive = true;
    const tick = (): void => {
      if (!alive) {
        return;
      }
      if (
        document.visibilityState === "visible" &&
        intersectingRef.current
      ) {
        wavePhaseRef.current =
          (performance.now() * 0.021) % (2 * Math.PI);
        setWaveFrame((n) => (n + 1) % 1_000_000);
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(frameId);
    };
  }, [runMotion]);

  const scenario = scenarioProp ?? DEFAULT_NEXAFS_CORE_ABSORPTION_SCENARIO;
  const { layout, timing, primaryPhoton: shot } = scenario;
  const cx = layout.nucleusCx;
  const cy = layout.nucleusCy;
  const r1s = layout.r1s;
  const r2s = layout.r2s;
  const r2p = layout.r2p;

  const targetSite = requireElectronSite(scenario, shot.targetElectronId);
  const impact = electronSiteCartesian(layout, targetSite);
  const hx = impact.x;
  const hy = impact.y;

  const exitTrajectory = resolveExitTrajectoryForShot(scenario, shot);
  const promo = promotionBeamEndpoints(impact, exitTrajectory);

  const photonStart = shot.ingress.ingressAnchor;
  const photonPath = buildWavyPath(
    photonStart.x,
    photonStart.y,
    hx,
    hy,
    shot.ingress.wavyGuide.wavelength,
    shot.ingress.wavyGuide.amplitude,
  );

  const { beamAngleDeg, packetStartCx, packetStartCy } =
    beamFrameFromIngressToImpact(
      photonStart,
      impact,
      shot.ingress.packetLeadIn,
    );

  const wavePacketPathLocal = runMotion
    ? buildEnvelopeWavePacketPath({
        halfLength: shot.wavePacket.halfLength,
        sigma: shot.wavePacket.sigma,
        amplitude: shot.wavePacket.amplitude,
        k: shot.wavePacket.k,
        phase: wavePhaseRef.current,
        envelopePower: shot.wavePacket.envelopePower,
        envelopeCutoff: shot.wavePacket.envelopeCutoff,
        steps: shot.wavePacket.steps,
      })
    : "";

  const ejBx = promo.arrowBaseX;
  const ejBy = promo.arrowBaseY;

  const vbY = 6;
  const vbH = 412;

  const ejTravelX = promo.travelX;
  const ejTravelY = promo.travelY;
  const motionDur = `${timing.motionDurSeconds}s`;

  const tPhotonHit = timing.photonHitNormalized;
  const tPhotonHoldEnd = timing.photonHoldEndNormalized;
  const tEjStart = tPhotonHit + timing.photonToEjectionLagNormalized;
  const tEjEnd = timing.ejectionEndNormalized;
  const tEjReset = timing.ejectionResetNormalized;

  const tImpactElectronFadeStart =
    tPhotonHit - timing.impactElectronFadeLeadBeforeHit;
  const tImpactElectronGone =
    tPhotonHit + timing.impactElectronFadeTrailAfterHit;
  const tAbsorbGlowStart =
    tPhotonHit - timing.absorbGlowStartLeadBeforeHit;
  const tAbsorbGlowRampEnd =
    tPhotonHit - timing.absorbGlowRampEndLeadBeforeHit;

  const photonTargetId = shot.targetElectronId;

  const shellGlyphs2p = shellOrbitalGlyphsForRadius(
    scenario,
    r2p,
    runMotion,
    photonTargetId,
  );
  const shellGlyphs2s = shellOrbitalGlyphsForRadius(
    scenario,
    r2s,
    runMotion,
    photonTargetId,
  );
  const shellGlyphs1s = shellOrbitalGlyphsForRadius(
    scenario,
    r1s,
    runMotion,
    photonTargetId,
  );

  return (
    <figure
      ref={figureRef}
      className={cn(
        "w-full overflow-hidden",
        presentation === "hero" &&
          "flex min-h-[min(260px,40svh)] items-center justify-center @sm:min-h-[min(300px,44svh)] @lg:min-h-[min(340px,50svh)]",
        className,
      )}
    >
      <svg
        ref={motionSvgRef}
        role="img"
        aria-labelledby="nexafs-absorption-schematic-title"
        viewBox={`0 ${vbY} 520 ${vbH}`}
        className={cn(
          "text-border mx-auto block h-auto w-full",
          presentation === "hero"
            ? "max-h-[min(640px,68svh)] max-w-none w-full @sm:max-h-[min(700px,72svh)] @lg:max-h-[min(760px,76svh)]"
            : "max-w-xl",
        )}
        xmlns="http://www.w3.org/2000/svg"
      >
        <title id="nexafs-absorption-schematic-title">
          Tunable photon absorption at a core 1s site: an inbound wave packet intersects the core shell
          and a photoelectron leaves along an outward trajectory in this simplified shell schematic
        </title>
        <defs>
          <linearGradient
            id="nexafs-photon-beam"
            gradientUnits="userSpaceOnUse"
            x1={photonStart.x}
            y1={photonStart.y}
            x2={hx}
            y2={hy}
          >
            <stop offset="0%" stopColor="oklch(72% 0.18 290)" />
            <stop offset="45%" stopColor="oklch(78% 0.22 300)" />
            <stop offset="100%" stopColor="oklch(96% 0.02 300)" />
          </linearGradient>
          <linearGradient
            id="nexafs-promotion-beam"
            gradientUnits="userSpaceOnUse"
            x1={hx}
            y1={hy}
            x2={ejBx}
            y2={ejBy}
          >
            <stop offset="0%" stopColor="oklch(78% 0.14 230)" stopOpacity="0.35" />
            <stop offset="45%" stopColor="oklch(82% 0.12 220)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="oklch(88% 0.08 200)" stopOpacity="0.55" />
          </linearGradient>
          <radialGradient id="nexafs-stage-vignette" cx="50%" cy="48%" r="68%">
            <stop offset="0%" stopColor="oklch(58% 0.07 286)" stopOpacity="0.22" />
            <stop offset="50%" stopColor="oklch(72% 0.04 264)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="oklch(88% 0.02 264)" stopOpacity="0.03" />
          </radialGradient>
          <radialGradient id="nexafs-nucleus-a" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="oklch(92% 0.06 290)" />
            <stop offset="70%" stopColor="oklch(52% 0.22 280)" />
            <stop offset="100%" stopColor="oklch(38% 0.18 270)" />
          </radialGradient>
          <radialGradient id="nexafs-nucleus-b" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="oklch(85% 0.05 240)" />
            <stop offset="100%" stopColor="oklch(48% 0.2 264)" />
          </radialGradient>
          <radialGradient id="nexafs-nucleus-c" cx="45%" cy="42%" r="55%">
            <stop offset="0%" stopColor="oklch(78% 0.08 220)" />
            <stop offset="100%" stopColor="oklch(42% 0.16 240)" />
          </radialGradient>
          <radialGradient id="nexafs-electron-core" cx="32%" cy="30%" r="62%">
            <stop offset="0%" stopColor="oklch(94% 0.03 250)" />
            <stop offset="55%" stopColor="oklch(62% 0.17 250)" />
            <stop offset="100%" stopColor="oklch(42% 0.15 260)" />
          </radialGradient>
          <radialGradient id="nexafs-electron-valence" cx="35%" cy="28%" r="58%">
            <stop offset="0%" stopColor="oklch(93% 0.05 150)" />
            <stop offset="55%" stopColor="oklch(72% 0.17 150)" />
            <stop offset="100%" stopColor="oklch(48% 0.14 155)" />
          </radialGradient>
          <radialGradient id="nexafs-electron-covalent" cx="34%" cy="30%" r="58%">
            <stop offset="0%" stopColor="oklch(94% 0.04 25)" />
            <stop offset="55%" stopColor="oklch(62% 0.22 25)" />
            <stop offset="100%" stopColor="oklch(46% 0.17 20)" />
          </radialGradient>
          <radialGradient id="nexafs-unoccupied-slot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(65% 0.14 290)" stopOpacity="0.12" />
            <stop offset="70%" stopColor="oklch(55% 0.08 290)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="oklch(45% 0.06 290)" stopOpacity="0.06" />
          </radialGradient>
          <radialGradient id="nexafs-absorption-core" cx="50%" cy="50%" r="48%">
            <stop offset="0%" stopColor="oklch(94% 0.09 95)" stopOpacity="1" />
            <stop offset="35%" stopColor="oklch(82% 0.14 75)" stopOpacity="0.85" />
            <stop offset="72%" stopColor="oklch(72% 0.18 55)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="oklch(60% 0.15 40)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nexafs-absorption-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(78% 0.2 290)" stopOpacity="0.55" />
            <stop offset="55%" stopColor="oklch(62% 0.14 280)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="oklch(45% 0.08 270)" stopOpacity="0" />
          </radialGradient>
          <filter
            id="nexafs-blur-soft"
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
          >
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="nexafs-bloom-wide" x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.55 0"
              result="dim"
            />
            <feMerge>
              <feMergeNode in="dim" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="nexafs-glow-tight" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3.2" result="g" />
            <feMerge>
              <feMergeNode in="g" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker
            id="nexafs-photon-arrow"
            markerUnits="userSpaceOnUse"
            markerWidth="16"
            markerHeight="16"
            refX="13"
            refY="8"
            orient="auto"
          >
            <path
              d="M0 1.5 L14 8 L0 14.5 Z"
              fill="oklch(93% 0.06 300)"
              stroke="oklch(72% 0.22 300)"
              strokeWidth="0.75"
              strokeLinejoin="round"
            />
          </marker>
          <marker
            id="nexafs-promotion-arrow"
            markerUnits="userSpaceOnUse"
            markerWidth="13"
            markerHeight="13"
            refX="11"
            refY="6.5"
            orient="auto"
          >
            <path
              d="M0 1 L11 6.5 L0 12 Z"
              fill="oklch(88% 0.09 210)"
              stroke="oklch(62% 0.14 230)"
              strokeWidth="0.65"
              strokeLinejoin="round"
            />
          </marker>
        </defs>

        {presentation === "standard" ? (
          <rect
            x="0"
            y={vbY}
            width="520"
            height={vbH}
            rx="24"
            fill="url(#nexafs-stage-vignette)"
            aria-hidden
          />
        ) : null}

        <g aria-hidden className="opacity-[0.35]">
          <circle cx={cx} cy={cy} r={r2p + 18} fill="none" stroke="oklch(70% 0.06 280)" strokeWidth="1" />
          <circle cx={cx} cy={cy} r={r2p + 30} fill="none" stroke="oklch(58% 0.05 280)" strokeWidth="0.75" opacity={0.55} />
        </g>

        <g filter="url(#nexafs-blur-soft)" opacity={0.45} aria-hidden>
          <circle cx={cx} cy={cy} r={r2p} fill="none" stroke="oklch(78% 0.06 280)" strokeWidth="10" strokeDasharray="10 12" />
          <circle cx={cx} cy={cy} r={r2s} fill="none" stroke="oklch(82% 0.05 200)" strokeWidth="8" />
          <circle cx={cx} cy={cy} r={r1s} fill="none" stroke="oklch(85% 0.05 220)" strokeWidth="8" />
        </g>

        <circle
          cx={cx}
          cy={cy}
          r={r2p}
          fill="none"
          stroke="oklch(88% 0.05 280)"
          strokeOpacity={0.55}
          strokeWidth={1.35}
          strokeDasharray="9 7"
          aria-hidden
        />
        <circle
          cx={cx}
          cy={cy}
          r={r2s}
          fill="none"
          stroke="oklch(90% 0.04 220)"
          strokeOpacity={0.62}
          strokeWidth={1.45}
          aria-hidden
        />
        <circle
          cx={cx}
          cy={cy}
          r={r1s}
          fill="none"
          stroke="oklch(93% 0.03 240)"
          strokeOpacity={0.72}
          strokeWidth={1.55}
          aria-hidden
        />

        <g aria-hidden>
          <circle cx={cx - 5} cy={cy + 3} r={11} fill="url(#nexafs-nucleus-a)" filter="url(#nexafs-glow-tight)" />
          <circle cx={cx + 8} cy={cy - 4} r={9} fill="url(#nexafs-nucleus-b)" opacity={0.96} />
          <circle cx={cx + 2} cy={cy + 11} r={7.5} fill="url(#nexafs-nucleus-c)" opacity={0.92} />
        </g>

        <ShellOrbitalGlyphs cx={cx} cy={cy} r={r2p} slots={shellGlyphs2p} />
        <ShellOrbitalGlyphs cx={cx} cy={cy} r={r2s} slots={shellGlyphs2s} />

        {!runMotion ? (
          <>
            <circle cx={hx} cy={hy} r={34} fill="url(#nexafs-absorption-halo)" opacity={0.52} aria-hidden />
            <circle cx={hx} cy={hy} r={22} fill="url(#nexafs-absorption-core)" aria-hidden />
          </>
        ) : null}

        <ShellOrbitalGlyphs cx={cx} cy={cy} r={r1s} slots={shellGlyphs1s} />

        {!runMotion ? (
          <>
            <path
              d={photonPath}
              fill="none"
              stroke="oklch(72% 0.24 300)"
              strokeOpacity={0.35}
              strokeWidth={9}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#nexafs-bloom-wide)"
              aria-hidden
            />
            <path
              d={photonPath}
              fill="none"
              stroke="url(#nexafs-photon-beam)"
              strokeWidth={2.85}
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd="url(#nexafs-photon-arrow)"
            />

            <line
              x1={hx}
              y1={hy}
              x2={ejBx}
              y2={ejBy}
              stroke="url(#nexafs-promotion-beam)"
              strokeWidth={2.35}
              strokeDasharray="8 7"
              strokeLinecap="round"
              opacity={0.94}
              markerEnd="url(#nexafs-promotion-arrow)"
              filter="url(#nexafs-glow-tight)"
              aria-hidden
            />
          </>
        ) : null}

        {runMotion ? (
          <g aria-hidden>
            <g>
              <circle cx={hx} cy={hy} r={34} fill="url(#nexafs-absorption-halo)" opacity={0}>
                <animate
                  attributeName="opacity"
                  attributeType="XML"
                  values="0;0;0;0.58;0.48;0.18;0;0"
                  keyTimes={`0;0.38;${tAbsorbGlowStart};${tAbsorbGlowRampEnd};${tPhotonHit};0.505;0.56;1`}
                  dur={motionDur}
                  repeatCount="indefinite"
                  calcMode="linear"
                />
              </circle>
              <circle cx={hx} cy={hy} r={22} fill="url(#nexafs-absorption-core)" opacity={0}>
                <animate
                  attributeName="opacity"
                  attributeType="XML"
                  values="0;0;0;0.95;0.72;0.2;0;0"
                  keyTimes={`0;0.38;${tAbsorbGlowStart};${tAbsorbGlowRampEnd};${tPhotonHit};0.505;0.56;1`}
                  dur={motionDur}
                  repeatCount="indefinite"
                  calcMode="linear"
                />
              </circle>
            </g>
            <g>
              <animate
                attributeName="opacity"
                attributeType="XML"
                values="1;1;1;1;0;0;0"
                keyTimes={`0;0.28;0.34;0.38;${tImpactElectronFadeStart};${tImpactElectronGone};1`}
                dur={motionDur}
                repeatCount="indefinite"
                calcMode="linear"
              />
              <circle
                cx={hx}
                cy={hy}
                r={7}
                fill="oklch(48% 0.14 268)"
                stroke="oklch(38% 0.1 270)"
                strokeWidth={1.1}
              />
            </g>
            <g>
              <animateTransform
                attributeName="transform"
                attributeType="XML"
                type="translate"
                values={`${packetStartCx},${packetStartCy}; ${hx},${hy}; ${hx},${hy}; ${packetStartCx},${packetStartCy}`}
                keyTimes={`0;${tPhotonHit};${tPhotonHoldEnd};1`}
                dur={motionDur}
                repeatCount="indefinite"
                calcMode="linear"
              />
              <animate
                attributeName="opacity"
                attributeType="XML"
                values="0;1;1;1;0;0"
                keyTimes={`0;0.03;0.05;0.34;${tPhotonHoldEnd};1`}
                dur={motionDur}
                repeatCount="indefinite"
                calcMode="linear"
              />
              <g transform={`rotate(${beamAngleDeg})`}>
                {wavePacketPathLocal.length > 8 ? (
                  <>
                    <path
                      d={wavePacketPathLocal}
                      fill="none"
                      stroke="oklch(58% 0.3 305)"
                      strokeOpacity={0.42}
                      strokeWidth={12}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#nexafs-bloom-wide)"
                    />
                    <path
                      d={wavePacketPathLocal}
                      fill="none"
                      stroke="oklch(84% 0.14 300)"
                      strokeWidth={2.85}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                ) : null}
              </g>
            </g>
            <g transform={`translate(${hx}, ${hy})`}>
              <animate
                attributeName="opacity"
                attributeType="XML"
                values="0;0;1;1;0;0"
                keyTimes={`0;${tEjStart - 0.012};${tEjStart};${tEjEnd};${tEjReset};1`}
                dur={motionDur}
                repeatCount="indefinite"
                calcMode="linear"
              />
              <path
                d={`M 0 0 L ${ejTravelX} ${ejTravelY}`}
                pathLength={100}
                fill="none"
                stroke="oklch(68% 0.16 240)"
                strokeWidth={9}
                strokeLinecap="round"
                strokeOpacity={0.22}
                strokeDasharray="100"
                strokeDashoffset={100}
                filter="url(#nexafs-bloom-wide)"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  attributeType="XML"
                  values="100;100;0;0;100"
                  keyTimes={`0;${tEjStart};${tEjEnd};${tEjReset};1`}
                  dur={motionDur}
                  repeatCount="indefinite"
                  calcMode="linear"
                />
              </path>
              <path
                d={`M 0 0 L ${ejTravelX} ${ejTravelY}`}
                pathLength={100}
                fill="none"
                stroke="oklch(82% 0.1 220)"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeOpacity={0.55}
                strokeDasharray="100"
                strokeDashoffset={100}
              >
                <animate
                  attributeName="stroke-dashoffset"
                  attributeType="XML"
                  values="100;100;0;0;100"
                  keyTimes={`0;${tEjStart};${tEjEnd};${tEjReset};1`}
                  dur={motionDur}
                  repeatCount="indefinite"
                  calcMode="linear"
                />
              </path>
              <path
                d={`M 0 0 L ${ejTravelX} ${ejTravelY}`}
                pathLength={100}
                fill="none"
                stroke="oklch(78% 0.12 230)"
                strokeWidth={1.15}
                strokeLinecap="round"
                strokeOpacity={0.35}
                strokeDasharray="6 14"
                strokeDashoffset={0}
              >
                <animate
                  attributeName="stroke-dashoffset"
                  attributeType="XML"
                  values="0;-140;-280;-280;0"
                  keyTimes={`0;${tEjStart};${tEjEnd};${tEjReset};1`}
                  dur={motionDur}
                  repeatCount="indefinite"
                  calcMode="linear"
                />
              </path>
              <g>
                <animateTransform
                  attributeName="transform"
                  attributeType="XML"
                  type="translate"
                  additive="replace"
                  values={`0,0; 0,0; ${ejTravelX},${ejTravelY}; ${ejTravelX},${ejTravelY}; 0,0`}
                  keyTimes={`0;${tEjStart};${tEjEnd};${tEjReset};1`}
                  dur={motionDur}
                  repeatCount="indefinite"
                  calcMode="linear"
                />
                <circle cx={0} cy={0} r={13} fill="oklch(64% 0.2 298)" filter="url(#nexafs-bloom-wide)" opacity={0}>
                  <animate
                    attributeName="opacity"
                    attributeType="XML"
                    values="0;0;0.42;0.48;0.38;0.15;0;0"
                    keyTimes={`0;${tEjStart};${tEjStart + 0.018};${tEjStart + 0.12};${tEjEnd - 0.05};${tEjEnd};${tEjReset};1`}
                    dur={motionDur}
                    repeatCount="indefinite"
                    calcMode="linear"
                  />
                </circle>
                <circle cx={0} cy={0} r={7.5} fill="url(#nexafs-electron-core)" />
              </g>
            </g>
          </g>
        ) : null}

        <ShellLabels cx={cx} cy={cy} r1s={r1s} r2s={r2s} r2p={r2p} />
      </svg>
    </figure>
  );
}

function buildWavyPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  wavelength: number,
  amplitude: number,
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return `M ${x1} ${y1}`;
  }
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const omega = (2 * Math.PI) / wavelength;
  const steps = Math.max(14, Math.ceil(len / 5));
  let d = `M ${x1} ${y1}`;
  for (let i = 1; i < steps; i++) {
    const s = (len * i) / steps;
    const wobble = amplitude * Math.sin(omega * s);
    const x = x1 + ux * s + px * wobble;
    const y = y1 + uy * s + py * wobble;
    d += ` L ${x} ${y}`;
  }
  d += ` L ${x2} ${y2}`;
  return d;
}

/** Local beam-axis polyline: compact super-Gaussian envelope times sin(k u + phase); drops samples below cutoff so tails stay off-axis. */
function buildEnvelopeWavePacketPath(opts: {
  halfLength: number;
  sigma: number;
  amplitude: number;
  k: number;
  phase: number;
  envelopePower?: number;
  envelopeCutoff?: number;
  steps?: number;
}): string {
  const {
    halfLength,
    sigma,
    amplitude,
    k,
    phase,
    envelopePower = 3.2,
    envelopeCutoff = 0.035,
    steps = 96,
  } = opts;
  const pts: { lx: number; ly: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = -halfLength + (2 * halfLength * i) / steps;
    const t = Math.abs(u / sigma);
    const env = Math.exp(-Math.pow(t, envelopePower));
    if (env < envelopeCutoff) {
      continue;
    }
    const transverse = amplitude * env * Math.sin(k * u + phase);
    pts.push({ lx: u, ly: -transverse });
  }
  const first = pts[0];
  if (pts.length < 2 || first === undefined) {
    return "";
  }
  let d = `M ${first.lx} ${first.ly}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    if (p !== undefined) {
      d += ` L ${p.lx} ${p.ly}`;
    }
  }
  return d;
}

function ShellOrbitalGlyphs({
  cx,
  cy,
  r,
  slots,
}: {
  cx: number;
  cy: number;
  r: number;
  slots: readonly ShellOrbitalGlyphSlot[];
}) {
  return (
    <g aria-hidden>
      {slots.map((slot) => {
        const rad = (slot.angleDeg * Math.PI) / 180;
        const x = cx + r * Math.cos(rad);
        const y = cy + r * Math.sin(rad);
        if (slot.variant === "bound-electron") {
          return (
            <g key={`${slot.angleDeg}-bound`}>
              <circle cx={x} cy={y} r={9} fill={slot.filledFill} opacity={0.22} />
              <circle cx={x - 1} cy={y - 1} r={7} fill={slot.filledFill} filter="url(#nexafs-glow-tight)" />
            </g>
          );
        }
        return (
          <g key={`${slot.angleDeg}-slot`}>
            <circle cx={x} cy={y} r={8.5} fill={slot.emptyFill} opacity={0.9} />
            <circle
              cx={x}
              cy={y}
              r={7}
              fill="none"
              stroke={slot.emptyStrokeColor}
              strokeWidth={1.35}
              strokeDasharray="3.5 3"
              strokeOpacity={0.85}
            />
          </g>
        );
      })}
    </g>
  );
}

function ShellLabels({
  cx,
  cy,
  r1s,
  r2s,
  r2p,
}: {
  cx: number;
  cy: number;
  r1s: number;
  r2s: number;
  r2p: number;
}) {
  const pad = 14;
  return (
    <g
      aria-hidden
      className="text-[12px] font-semibold sm:text-[13px]"
      style={{ paintOrder: "stroke fill" }}
    >
      <text
        x={cx + r1s - pad}
        y={cy - r1s + pad}
        fill="oklch(82% 0.12 250)"
        stroke="var(--border)"
        strokeOpacity={0.95}
        strokeWidth={3}
      >
        1s
      </text>
      <text
        x={cx + r2s - pad}
        y={cy + r2s - pad}
        fill="oklch(82% 0.14 150)"
        stroke="var(--border)"
        strokeOpacity={0.95}
        strokeWidth={3}
      >
        2s
      </text>
      <text
        x={cx + r2p - pad}
        y={cy - r2p + pad}
        fill="oklch(78% 0.16 25)"
        stroke="var(--border)"
        strokeOpacity={0.95}
        strokeWidth={3}
      >
        2p
      </text>
    </g>
  );
}
