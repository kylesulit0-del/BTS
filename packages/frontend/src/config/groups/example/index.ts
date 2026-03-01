/**
 * Example Group Configuration Template
 *
 * Copy this directory to create a new group. All fields are required --
 * TypeScript will error if any are missing.
 *
 * Steps:
 * 1. Copy this directory: cp -r src/config/groups/example src/config/groups/mygroup
 * 2. Edit each field with your group's data
 * 3. Change the import in src/config/index.ts:
 *      import { exampleConfig } from "./groups/mygroup/index.ts";
 *    to:
 *      import { myGroupConfig } from "./groups/mygroup/index.ts";
 * 4. Update the export: export const config: GroupConfig = myGroupConfig;
 * 5. Run `npx tsc --noEmit` to verify all fields are present
 */
import type {
  GroupConfig,
  GroupLabels,
  MemberConfig,
  SourceEntry,
  ThemeConfig,
  Event,
  NewsItem,
} from "../../types.ts";

const members: MemberConfig[] = [
  {
    id: "member1",
    stageName: "Stage Name",
    realName: "Real Name",
    aliases: ["stagename", "realname"],
    emoji: "",
    color: "#7c3aed",
    birthday: "January 1, 2000",
    role: "Vocalist",
    position: "Main Vocalist",
    image: "/members/member1.jpg",
    bio: "A short biography of this member.",
    funFacts: ["Fun fact 1", "Fun fact 2"],
    soloProjects: ["Solo Project (album)"],
    socialMedia: [
      { platform: "Instagram", handle: "@member1" },
    ],
  },
];

const sources: SourceEntry[] = [
  {
    type: "reddit",
    id: "r-mygroup",
    label: "r/MyGroup",
    url: "https://www.reddit.com/r/MyGroup",
    needsFilter: false,
  },
];

const theme: ThemeConfig = {
  groupName: "My Group",
  groupNameNative: "My Group Native Name",
  tagline: "A tagline for the group",
  fandomName: "Fans",
  primaryColor: "#7c3aed",
  accentColor: "#a78bfa",
  darkColor: "#0d0d0d",
  logoUrl: "/group-logo.png",
  socialLinks: [
    { platform: "Twitter", handle: "@mygroup", url: "https://twitter.com/mygroup" },
  ],
};

const labels: GroupLabels = {
  appName: "My Group Fan App",
  appTitle: "My Group - Fan App",
  appDescription: "Fan app for My Group",
  sourceLabels: {
    reddit: "Reddit",
  },
  memberFilterLabel: "Select Your Favorite",
  homeQuote: "An inspiring group quote",
  tourTitle: "MY GROUP WORLD TOUR",
  tourSubtitle: "Dates and venues TBA",
};

const events: Event[] = [
  {
    id: "event-1",
    title: "My Group Concert",
    date: "2026-06-01",
    venue: "Example Arena",
    city: "Example City",
    region: "worldwide",
    description: "An exciting concert event.",
    status: "upcoming",
  },
];

const news: NewsItem[] = [
  {
    id: "news-1",
    headline: "My Group Announces New Album",
    date: "2026-01-15",
    summary: "My Group has announced their highly anticipated new album.",
    source: "Official",
    sourceUrl: "https://example.com",
  },
];

function buildKeywords(memberConfigs: MemberConfig[]): RegExp {
  const allAliases = memberConfigs.flatMap((m) => m.aliases);
  const groupTerms = ["mygroup"];
  const allTerms = [...allAliases, ...groupTerms];
  const escaped = allTerms.map((term) =>
    term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  return new RegExp(`\\b(?:${escaped.join("|")})\\b`, "i");
}

export const exampleConfig = {
  members,
  sources,
  theme,
  keywords: buildKeywords(members),
  labels,
  events,
  news,
} satisfies GroupConfig;
