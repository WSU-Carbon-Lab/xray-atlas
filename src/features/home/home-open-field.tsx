import type { ReactElement } from "react";

/**
 * Soft spectrum drawn under the home search.
 *
 * Three carbon-edge-like traces and a wash sit in the accent color at low
 * opacity. Motion is applied in CSS and removed when the viewer asks for
 * reduced motion. The field does not receive pointer events.
 */
export function HomeOpenField(): ReactElement {
  return (
    <div className="home-open__field" aria-hidden>
      <svg viewBox="0 0 1440 220" preserveAspectRatio="xMidYMid slice">
        <path
          className="home-open__wash"
          d="M0 168 C220 168 300 150 390 108 C450 78 490 36 540 46 C590 56 630 112 710 86 C790 60 840 28 910 44 C980 60 1040 130 1160 150 C1280 168 1360 166 1440 164 L1440 220 L0 220 Z"
          fill="var(--accent)"
        />
        <g className="home-open__drift">
          <path
            d="M0 158 C200 158 310 152 390 112 C440 84 488 40 542 50 C596 60 640 118 724 92 C808 66 852 32 922 48 C992 64 1056 136 1180 154 C1300 170 1380 164 1440 160"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.35"
          />
          <path
            d="M0 176 C240 176 340 170 430 138 C500 114 548 72 610 82 C672 92 720 140 810 122 C900 104 960 78 1040 96 C1120 114 1220 158 1440 168"
            fill="none"
            stroke="var(--foreground)"
            strokeWidth="1.1"
            strokeOpacity="0.45"
          />
        </g>
        <g className="home-open__drift home-open__drift--alt">
          <path
            d="M0 146 C180 146 260 140 340 100 C400 72 448 22 510 34 C572 46 620 96 700 74 C780 52 830 18 900 36 C970 54 1040 118 1160 138 C1280 156 1360 150 1440 146"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.15"
            strokeOpacity="0.7"
          />
        </g>
      </svg>
    </div>
  );
}
