import type { ThemeConfig } from "./types.ts";

/**
 * Apply theme colors from config as CSS custom properties on the document root.
 * This overrides the fallback defaults defined in App.css :root.
 */
export function applyTheme(theme: ThemeConfig): void {
  const style = document.documentElement.style;
  style.setProperty("--theme-primary", theme.primaryColor);
  style.setProperty("--theme-accent", theme.accentColor);
  style.setProperty("--theme-dark", theme.darkColor);
}
