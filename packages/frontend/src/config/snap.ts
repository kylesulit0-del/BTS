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

export const PAGING_DEAD_ZONE = 10;
export const PAGING_AXIS_LOCK_RATIO = 1.5;
export const PAGING_DISTANCE_RATIO = 0.25;
export const PAGING_VELOCITY_THRESHOLD = 0.3;
export const PAGING_SPRING_DURATION = 300;
export const PAGING_SPRING_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';
