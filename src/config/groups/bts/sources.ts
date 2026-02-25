import type { SourceEntry } from "../../types.ts";

export const sources: SourceEntry[] = [
  // Reddit sources
  {
    type: "reddit",
    id: "reddit-bangtan",
    label: "r/bangtan",
    url: "bangtan",
    needsFilter: false,
    fetchCount: 15,
    priority: 1,
  },
  {
    type: "reddit",
    id: "reddit-kpop",
    label: "r/kpop",
    url: "kpop",
    needsFilter: true,
    fetchCount: 15,
    priority: 2,
  },
  {
    type: "reddit",
    id: "reddit-heungtan",
    label: "r/heungtan",
    url: "heungtan",
    needsFilter: false,
    fetchCount: 15,
    priority: 3,
  },
  {
    type: "reddit",
    id: "reddit-bts7",
    label: "r/bts7",
    url: "bts7",
    needsFilter: false,
    fetchCount: 15,
    priority: 4,
  },

  // YouTube sources
  {
    type: "youtube",
    id: "yt-bangtantv",
    label: "BANGTANTV",
    url: "UCLkAepWjdylmXSltofFvsYQ",
    needsFilter: false,
    fetchCount: 10,
    priority: 5,
  },
  {
    type: "youtube",
    id: "yt-hybe",
    label: "HYBE LABELS",
    url: "UCx2hOXK_cGnRolCRilNUfA",
    needsFilter: true,
    fetchCount: 10,
    priority: 6,
  },

  // RSS sources
  {
    type: "rss",
    id: "rss-soompi",
    label: "Soompi",
    url: "https://www.soompi.com/feed",
    needsFilter: true,
    fetchCount: 10,
    priority: 7,
  },
  {
    type: "rss",
    id: "rss-allkpop",
    label: "AllKPop",
    url: "https://www.allkpop.com/feed",
    needsFilter: true,
    fetchCount: 10,
    priority: 8,
  },

  // Twitter sources
  {
    type: "twitter",
    id: "twitter-search",
    label: "X/Twitter",
    url: "https://nitter.net/search?q=BTS&f=tweets",
    needsFilter: false,
    fetchCount: 10,
    priority: 9,
  },
];
