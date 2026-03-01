import type { GroupConfig } from "./types.ts";
import { btsConfig } from "./groups/bts/index.ts";

/**
 * Active group configuration.
 *
 * To swap groups, change the import above to point at a different
 * group directory (e.g., `./groups/twice/index.ts`).
 *
 * All app code should import from `src/config` -- never directly
 * from `src/config/groups/bts/`.
 */
export const config: GroupConfig = btsConfig;

export function getConfig(): GroupConfig {
  return config;
}
