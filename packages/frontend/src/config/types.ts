export interface MemberConfig {
  id: string;
  stageName: string;
  realName: string;
  aliases: string[];
  emoji: string;
  color: string;
  birthday: string;
  role: string;
  position: string;
  image: string;
  gallery?: string[];
  bio: string;
  funFacts: string[];
  soloProjects: string[];
  socialMedia: { platform: string; handle: string; url?: string }[];
}

export interface SourceEntry {
  type: string;
  id: string;
  label: string;
  url: string;
  needsFilter: boolean;
  fetchCount?: number;
  refreshInterval?: number;
  priority?: number;
  enabled?: boolean;
}

export interface ThemeTokens {
  surfaceColor?: string;
  surfaceElevatedColor?: string;
  overlayColor?: string;
  textPrimaryColor?: string;
  textSecondaryColor?: string;
  textOnPrimaryColor?: string;
  radiusSm?: string;
  radiusMd?: string;
  radiusLg?: string;
  cardOverlayGradient?: string;
  controlBarBg?: string;
}

export interface ThemeConfig {
  groupName: string;
  groupNameNative: string;
  tagline: string;
  fandomName: string;
  primaryColor: string;
  accentColor: string;
  darkColor: string;
  logoUrl: string;
  socialLinks: { platform: string; handle: string; url: string }[];
  tokens?: ThemeTokens;
}

export interface GroupLabels {
  appName: string;
  appTitle: string;
  appDescription: string;
  sourceLabels: Record<string, string>;
  memberFilterLabel: string;
  homeQuote: string;
  tourTitle: string;
  tourSubtitle: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  venue: string;
  city: string;
  region: string;
  description: string;
  status: string;
  ticketUrl?: string;
}

export interface NewsItem {
  id: string;
  headline: string;
  date: string;
  summary: string;
  source: string;
  sourceUrl: string;
}

export interface GroupConfig {
  members: MemberConfig[];
  sources: SourceEntry[];
  theme: ThemeConfig;
  keywords: RegExp;
  labels: GroupLabels;
  events: Event[];
  news: NewsItem[];
  feedMode?: "snap" | "list";
}
