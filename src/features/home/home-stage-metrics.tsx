"use client";

import { useLayoutEffect } from "react";

/**
 * Publishes the sticky header height and the layout viewport height as
 * `--home-header` and `--home-viewport` on the document element.
 *
 * Home stages use those variables so a stage fills the visible area under
 * the header. `100svh` is shorter than the layout viewport in some browsers,
 * which leaves the next stage's back link on screen.
 */
export function HomeStageMetrics(): null {
  useLayoutEffect(() => {
    const header = document.querySelector("[data-site-header]");
    const apply = (): void => {
      const headerHeight = header?.getBoundingClientRect().height ?? 0;
      if (headerHeight <= 0) {
        return;
      }
      document.documentElement.style.setProperty(
        "--home-header",
        `${headerHeight}px`,
      );
      document.documentElement.style.setProperty(
        "--home-viewport",
        `${window.innerHeight}px`,
      );
    };
    apply();
    const observer = new ResizeObserver(apply);
    if (header) {
      observer.observe(header);
    }
    window.addEventListener("resize", apply);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);
  return null;
}
