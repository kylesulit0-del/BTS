import DOMPurify from "dompurify";
import type { Config } from "dompurify";

const SANITIZE_CONFIG: Config = {
  ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "img", "br", "p"],
  ALLOWED_ATTR: ["href", "src", "alt", "target", "rel"],
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false,
};

/**
 * Sanitize untrusted HTML content. Returns safe HTML string.
 * Policy: text, links, basic formatting, and images only.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, SANITIZE_CONFIG) as string;
}

/**
 * Strip all HTML, returning plain text only.
 * Replacement for the old unsafe stripHtml function (which used div.innerHTML).
 */
export function stripToText(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] }) as string;
}
