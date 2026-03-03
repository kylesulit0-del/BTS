import type { GroupConfig } from "../../types.ts";
import { events } from "./events.ts";
import { labels } from "./labels.ts";
import { members } from "./members.ts";
import { news } from "./news.ts";
import { sources } from "./sources.ts";
import { theme } from "./theme.ts";

function buildKeywords(memberConfigs: typeof members): RegExp {
  // Use full/unambiguous aliases only — skip short or generic terms
  // that cause false positives on general K-pop sites (e.g. "army"
  // matches any military article, "rm"/"jk"/"tae" are too short)
  const skipTerms = new Set(["rm", "jk", "tae", "mono", "golden", "army"]);
  const allAliases = memberConfigs
    .flatMap((m) => m.aliases)
    .filter((a) => !skipTerms.has(a.toLowerCase()));
  const groupTerms = ["bts", "bangtan", "\uBC29\uD0C4", "bts army"];
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
  labels,
  events,
  news,
  feedMode: "list",
} satisfies GroupConfig;
