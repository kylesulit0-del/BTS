/**
 * Snap Feed Configuration
 *
 * DOM_WINDOW_SIZE controls how many items are rendered in the DOM at any time.
 * A larger value means smoother scrolling (less frequent window shifts) at the
 * cost of more DOM nodes. Must be an odd number so the current item is centered.
 *
 * Recommended values:
 *   3 — minimal DOM, frequent shifts (may cause visible jumps)
 *   5 — balanced (default)
 *   7 — smoother scrolling for fast flickers, more DOM nodes
 */
export const DOM_WINDOW_SIZE = 5;
