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
    url: "UC3IZKseVpdzPSBaWxBxundA",
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

  // Additional Reddit sources
  {
    type: "reddit",
    id: "reddit-kpoopheads",
    label: "r/kpoopheads",
    url: "kpoopheads",
    needsFilter: true,
    fetchCount: 10,
    priority: 10,
  },
  {
    type: "reddit",
    id: "reddit-btsworld",
    label: "r/BTSWorld",
    url: "BTSWorld",
    needsFilter: false,
    fetchCount: 10,
    priority: 11,
  },

  // Fan YouTube channels
  {
    type: "youtube",
    id: "yt-bangtansubs",
    label: "BANGTANSUBS",
    url: "UC5m4L0y_OJIJ2NWPRcayXvg",
    needsFilter: false,
    fetchCount: 10,
    priority: 12,
  },
  {
    type: "youtube",
    id: "yt-dkdktv",
    label: "DKDKTV",
    url: "UCVEzR8VHu0JC5xlTr53cMwQ",
    needsFilter: true,
    fetchCount: 10,
    priority: 13,
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

  // Tumblr sources
  {
    type: "tumblr",
    id: "tumblr-bts-trans",
    label: "bts-trans",
    url: "https://bts-trans.tumblr.com/rss",
    needsFilter: false,
    fetchCount: 10,
    priority: 20,
  },
  {
    type: "tumblr",
    id: "tumblr-kimtaegis",
    label: "kimtaegis",
    url: "https://kimtaegis.tumblr.com/rss",
    needsFilter: true,
    fetchCount: 10,
    priority: 21,
  },
  {
    type: "tumblr",
    id: "tumblr-userparkjimin",
    label: "userparkjimin",
    url: "https://userparkjimin.tumblr.com/rss",
    needsFilter: true,
    fetchCount: 10,
    priority: 22,
  },
  {
    type: "tumblr",
    id: "tumblr-namjin",
    label: "namjin",
    url: "https://namjin.tumblr.com/rss",
    needsFilter: true,
    fetchCount: 10,
    priority: 23,
  },
  {
    type: "tumblr",
    id: "tumblr-jikook",
    label: "jikook",
    url: "https://jikook.tumblr.com/rss",
    needsFilter: true,
    fetchCount: 10,
    priority: 24,
  },
];
