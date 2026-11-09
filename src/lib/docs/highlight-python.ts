/**
 * Server-side Python syntax highlighting for Dev Docs.
 *
 * Uses Shiki's fine-grained core bundle so only the Python grammar and the two
 * docs themes are loaded. The returned HTML carries both theme colours as CSS
 * custom properties; `globals.css` selects one from the `dark` class or
 * `data-theme` attribute, matching the rest of the docs shell.
 */

import githubDark from "@shikijs/themes/github-dark";
import githubLight from "@shikijs/themes/github-light";
import python from "@shikijs/langs/python";
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

let highlighterPromise: Promise<HighlighterCore> | null = null;
const cache = new Map<string, string>();

function highlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= createHighlighterCore({
    themes: [githubLight, githubDark],
    langs: [python],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighterPromise;
}

/**
 * Highlights Python source as HTML for the docs surface.
 *
 * @param code - Python source exactly as it will be copied.
 * @returns Shiki HTML with light and dark theme variables on every token.
 */
export async function highlightPython(code: string): Promise<string> {
  const cached = cache.get(code);
  if (cached !== undefined) {
    return cached;
  }
  const html = (await highlighter()).codeToHtml(code, {
    lang: "python",
    themes: { light: githubLight, dark: githubDark },
  });
  cache.set(code, html);
  return html;
}
