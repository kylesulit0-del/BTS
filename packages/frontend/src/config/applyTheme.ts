import type { ThemeConfig } from "./types.ts";

/**
 * Apply theme colors from config as CSS custom properties on the document root.
 * This overrides the fallback defaults defined in App.css :root.
 */
export function applyTheme(theme: ThemeConfig): void {
  const s = document.documentElement.style;
  s.setProperty("--theme-primary", theme.primaryColor);
  s.setProperty("--theme-accent", theme.accentColor);
  s.setProperty("--theme-dark", theme.darkColor);

  const t = theme.tokens;
  if (t) {
    if (t.surfaceColor) s.setProperty("--bg-card", t.surfaceColor);
    if (t.surfaceElevatedColor) s.setProperty("--surface-elevated", t.surfaceElevatedColor);
    if (t.overlayColor) s.setProperty("--overlay", t.overlayColor);
    if (t.textPrimaryColor) s.setProperty("--text-primary", t.textPrimaryColor);
    if (t.textSecondaryColor) s.setProperty("--text-secondary", t.textSecondaryColor);
    if (t.textOnPrimaryColor) s.setProperty("--text-on-primary", t.textOnPrimaryColor);
    if (t.radiusSm) s.setProperty("--radius-sm", t.radiusSm);
    if (t.radiusMd) s.setProperty("--radius-md", t.radiusMd);
    if (t.radiusLg) s.setProperty("--radius-lg", t.radiusLg);
    if (t.cardOverlayGradient) s.setProperty("--card-overlay-gradient", t.cardOverlayGradient);
    if (t.controlBarBg) s.setProperty("--control-bar-bg", t.controlBarBg);
  }
}
