/**
 * Abbreviate a number for display: 1200 -> "1.2k", 1500000 -> "1.5M".
 * Strips trailing ".0" (e.g. "1.0k" -> "1k").
 */
export function abbreviateNumber(n: number): string {
  if (n >= 1_000_000) {
    const val = (n / 1_000_000).toFixed(1);
    return val.endsWith(".0") ? val.slice(0, -2) + "M" : val + "M";
  }
  if (n >= 1_000) {
    const val = (n / 1_000).toFixed(1);
    return val.endsWith(".0") ? val.slice(0, -2) + "k" : val + "k";
  }
  return n.toString();
}
