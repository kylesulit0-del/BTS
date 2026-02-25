import type { GroupConfig } from "../../types.ts";
import { members } from "./members.ts";
import { sources } from "./sources.ts";
import { theme } from "./theme.ts";

function buildKeywords(memberConfigs: typeof members): RegExp {
  const allAliases = memberConfigs.flatMap((m) => m.aliases);
  const groupTerms = ["bts", "bangtan", "\uBC29\uD0C4", "army"];
  const allTerms = [...allAliases, ...groupTerms];

  // Escape special regex characters, then join with alternation
  const escaped = allTerms.map((term) =>
    term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );

  return new RegExp(`\\b(?:${escaped.join("|")})\\b`, "i");
}

export const btsConfig = {
  members,
  sources,
  theme,
  keywords: buildKeywords(members),
} satisfies GroupConfig;
