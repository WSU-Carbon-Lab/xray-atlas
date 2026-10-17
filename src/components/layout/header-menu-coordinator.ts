/**
 * Keeps a single header menu open.
 *
 * Hovering Browse, About, Contribute, or the theme control announces that id.
 * Every other open menu closes. This module does not render UI.
 */

const HEADER_MENU_EVENT = "xray-atlas-header-menu";

/**
 * Closes every header menu except `id`.
 *
 * @param id - Menu that should stay open.
 */
export function announceHeaderMenu(id: string): void {
  window.dispatchEvent(new CustomEvent(HEADER_MENU_EVENT, { detail: id }));
}

/**
 * Closes `close` when another header menu announces itself.
 *
 * @param id - Menu that owns this subscription.
 * @param close - Called when a different menu opens.
 * @returns Removes the listener.
 */
export function subscribeHeaderMenu(id: string, close: () => void): () => void {
  function onEvent(event: Event): void {
    const detail = (event as CustomEvent<string>).detail;
    if (detail !== id) {
      close();
    }
  }

  window.addEventListener(HEADER_MENU_EVENT, onEvent);
  return () => window.removeEventListener(HEADER_MENU_EVENT, onEvent);
}

/**
 * True when the pointer can hover, so menus may open without a click.
 */
export function headerMenuCanHover(): boolean {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}
