import type { ReactNode } from "react";
import type { FeedStats } from "../../types/feed";
import { abbreviateNumber } from "../../utils/formatNumber";

const MIN_STAT_THRESHOLD = 2;

interface StatEntry {
  key: string;
  value: number;
  icon: ReactNode;
}

interface SnapStatsBarProps {
  stats?: FeedStats;
}

export default function SnapStatsBar({ stats }: SnapStatsBarProps) {
  if (!stats) return null;

  const entries: StatEntry[] = [];

  if (stats.upvotes != null && stats.upvotes >= MIN_STAT_THRESHOLD) {
    entries.push({
      key: "upvotes",
      value: stats.upvotes,
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <path d="M7 2L2 8h3v4h4V8h3z" />
        </svg>
      ),
    });
  }

  if (stats.comments != null && stats.comments >= MIN_STAT_THRESHOLD) {
    entries.push({
      key: "comments",
      value: stats.comments,
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <path d="M2 2h10v7H5l-3 3V2z" />
        </svg>
      ),
    });
  }

  if (stats.views != null && stats.views >= MIN_STAT_THRESHOLD) {
    entries.push({
      key: "views",
      value: stats.views,
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <path d="M7 4C4 4 1.5 7 1.5 7s2.5 3 5.5 3 5.5-3 5.5-3S10 4 7 4zm0 5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
        </svg>
      ),
    });
  }

  if (stats.likes != null && stats.likes >= MIN_STAT_THRESHOLD) {
    entries.push({
      key: "likes",
      value: stats.likes,
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <path d="M7 12S1.5 8.5 1.5 5.5C1.5 3.5 3 2 4.5 2c1 0 2 .5 2.5 1.5C7.5 2.5 8.5 2 9.5 2c1.5 0 3 1.5 3 3.5C12.5 8.5 7 12 7 12z" />
        </svg>
      ),
    });
  }

  if (entries.length === 0) return null;

  return (
    <div className="snap-stats-bar">
      {entries.map((entry) => (
        <span key={entry.key} className="snap-stats-item">
          {entry.icon}
          {abbreviateNumber(entry.value)}
        </span>
      ))}
    </div>
  );
}
