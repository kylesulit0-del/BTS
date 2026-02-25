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
}

export interface GroupConfig {
  members: MemberConfig[];
  sources: SourceEntry[];
  theme: ThemeConfig;
  keywords: RegExp;
}
