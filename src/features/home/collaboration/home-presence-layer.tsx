"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type RefObject,
} from "react";

interface PresencePeer {
  name: string;
  initials: string;
  /** Stable identity hue, distinct from the grey-to-red spectrum ramp. */
  color: string;
  left: string;
  top: string;
}

/**
 * People already on the spectrum. Hues identify the cursor, not a data channel.
 * Positions are percentages of the axis frame, inset so the name stays inside it.
 */
const PEERS: readonly PresencePeer[] = [
  {
    name: "Alan",
    initials: "AD",
    color: "oklch(0.62 0.15 145)",
    left: "16%",
    top: "28%",
  },
  {
    name: "Jonny",
    initials: "JW",
    color: "oklch(0.55 0.16 280)",
    left: "48%",
    top: "16%",
  },
  {
    name: "Copple",
    initials: "CP",
    color: "oklch(0.67 0.15 35)",
    left: "24%",
    top: "58%",
  },
  {
    name: "Terry",
    initials: "TP",
    color: "oklch(0.72 0.14 75)",
    left: "70%",
    top: "42%",
  },
];

const YOU_COLOR = "oklch(0.58 0.17 310)";

/**
 * Draws one presence pointer and its name pill.
 *
 * `color` is the peer's identity color. The glyph tip is the element's origin,
 * so a following cursor can sit on the pointer coordinates.
 */
/**
 * Pointer and name. The element origin is the glyph tip. `flip` places the
 * name to the left of the tip so a mark near the right edge stays in the frame.
 */
function PresenceCursor({
  name,
  color,
  flip,
}: {
  name: string;
  color: string;
  flip: boolean;
}): ReactElement {
  return (
    <div className="relative h-0 w-0">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        aria-hidden
        className="absolute top-0 left-0 -translate-x-[4px] -translate-y-[2px]"
      >
        <path
          d="M5.5 3.2 L5.5 18.4 L9.6 14.2 L13.4 21.2 L16.2 19.8 L12.3 13.1 L18.4 12.6 Z"
          fill={color}
          stroke="white"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="absolute top-3.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap text-white shadow-sm"
        style={
          flip
            ? { backgroundColor: color, right: 16 }
            : { backgroundColor: color, left: 14 }
        }
      >
        {name}
      </span>
    </div>
  );
}

interface PlotBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Screen box of the axis frame, relative to `root`.
 * Returns `null` until the frame has a size.
 */
function usePlotBox(root: RefObject<HTMLDivElement | null>): PlotBox | null {
  const [box, setBox] = useState<PlotBox | null>(null);
  useLayoutEffect(() => {
    const host = root.current;
    const frame = host?.parentElement?.querySelector("[data-home-plot-frame]");
    if (!host || !(frame instanceof Element)) return;
    const measure = () => {
      const hostRect = host.getBoundingClientRect();
      const plot = frame.getBoundingClientRect();
      const next: PlotBox = {
        left: plot.left - hostRect.left,
        top: plot.top - hostRect.top,
        width: plot.width,
        height: plot.height,
      };
      setBox((prev) =>
        prev &&
        prev.left === next.left &&
        prev.top === next.top &&
        prev.width === next.width &&
        prev.height === next.height
          ? prev
          : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [root]);
  return box;
}

/**
 * Drifts each peer a few pixels on a slow sine so the cursors read as live.
 * Does nothing when the viewer asks for reduced motion.
 */
function usePresenceDrift(
  drifts: RefObject<Array<HTMLDivElement | null>>,
): void {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      for (let index = 0; index < PEERS.length; index += 1) {
        const node = drifts.current[index];
        if (!node) continue;
        const dx = Math.sin(t * 0.42 + index * 1.7) * 7;
        const dy = Math.cos(t * 0.33 + index * 1.15) * 5;
        node.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [drifts]);
}

/**
 * Presence marks for the Collaborate display.
 *
 * Alan, Jonny, Copple, and Terry stay inside the axis frame and drift a few
 * pixels. While the pointer is over that frame the system cursor is hidden
 * and the You cursor is the pointer. The You avatar appears with it.
 */
export function HomePresenceLayer(): ReactElement {
  const [you, setYou] = useState<{
    x: number;
    y: number;
    flip: boolean;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const drifts = useRef<Array<HTMLDivElement | null>>([]);
  const box = usePlotBox(rootRef);
  usePresenceDrift(drifts);

  function place(event: ReactMouseEvent<HTMLDivElement>): void {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setYou({ x, y, flip: x + 78 > rect.width });
  }

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-0 z-10"
      role="group"
      aria-label={
        you
          ? "You joined Alan, Jonny, Copple, and Terry on this spectrum."
          : "Alan, Jonny, Copple, and Terry are on this spectrum. Move the pointer over the plot to join them."
      }
    >
      <ul className="absolute top-1 right-1 flex items-center">
        {PEERS.map((peer, index) => (
          <li key={peer.name} className={index === 0 ? "" : "-ml-2"}>
            <span
              className="bg-surface flex size-8 items-center justify-center rounded-full border-2 text-[10px] font-semibold"
              style={{ borderColor: peer.color, color: peer.color }}
            >
              {peer.initials}
            </span>
          </li>
        ))}
        {you ? (
          <li className="-ml-2">
            <span
              className="bg-surface flex h-8 items-center justify-center rounded-full border-2 px-2 text-[11px] font-semibold"
              style={{ borderColor: YOU_COLOR, color: YOU_COLOR }}
            >
              You
            </span>
          </li>
        ) : null}
      </ul>
      {box ? (
        <div
          className="pointer-events-auto absolute cursor-none"
          style={{
            left: box.left,
            top: box.top,
            width: box.width,
            height: box.height,
          }}
          onPointerEnter={place}
          onPointerMove={place}
          onPointerLeave={() => setYou(null)}
          onMouseEnter={place}
          onMouseMove={place}
          onMouseLeave={() => setYou(null)}
        >
          {PEERS.map((peer, index) => (
            <div
              key={peer.name}
              className="pointer-events-none absolute"
              style={{ left: peer.left, top: peer.top }}
              aria-hidden
            >
              <div
                ref={(node) => {
                  drifts.current[index] = node;
                }}
              >
                <PresenceCursor
                  name={peer.name}
                  color={peer.color}
                  flip={Number.parseFloat(peer.left) >= 60}
                />
              </div>
            </div>
          ))}
          {you ? (
            <div
              className="pointer-events-none absolute"
              style={{ left: you.x, top: you.y }}
              aria-hidden
            >
              <PresenceCursor name="You" color={YOU_COLOR} flip={you.flip} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
