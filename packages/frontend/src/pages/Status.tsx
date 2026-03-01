import { useState, useEffect, useCallback } from "react";

interface RecentRun {
  status: string;
  startedAt: string | null;
  itemsFound: number;
  duration: number;
}

interface SourceHealth {
  source: string;
  status: "green" | "yellow" | "red";
  lastRun: string | null;
  lastStatus: string;
  itemsFound: number;
  recentRuns: RecentRun[];
}

interface HealthResponse {
  sources: SourceHealth[];
  uptime: number;
  lastScrapeAt: string | null;
}

const trafficColors: Record<string, string> = {
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
};

const trafficLabels: Record<string, string> = {
  green: "Healthy",
  yellow: "Degraded",
  red: "Down",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 0) return "just now";
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function SkeletonStatusCard() {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#374151",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <div
          style={{
            width: 80,
            height: 16,
            borderRadius: 4,
            background: "#374151",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginTop: 8 }}>
        <div
          style={{
            width: "60%",
            height: 12,
            borderRadius: 4,
            background: "#374151",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <div
          style={{
            width: "40%",
            height: 12,
            borderRadius: 4,
            background: "#374151",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      </div>
    </div>
  );
}

export default function Status() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL;

  const fetchHealth = useCallback(async () => {
    if (!apiUrl) {
      setError("Status page requires API connection (set VITE_API_URL)");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/health/sources`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: HealthResponse = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(`Failed to load health data: ${err instanceof Error ? err.message : err}`);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60_000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Source Status</h1>
        {data && (
          <span style={styles.subtitle}>
            Server uptime: {formatUptime(data.uptime)}
            {data.lastScrapeAt && ` | Last scrape: ${timeAgo(data.lastScrapeAt)}`}
          </span>
        )}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {loading && (
        <div style={styles.list}>
          <SkeletonStatusCard />
          <SkeletonStatusCard />
          <SkeletonStatusCard />
        </div>
      )}

      {!loading && data && (
        <div style={styles.list}>
          {data.sources.map((src) => (
            <div key={src.source} style={styles.card}>
              <div style={styles.cardHeader}>
                <div
                  style={{
                    ...styles.trafficDot,
                    background: trafficColors[src.status] ?? "#6b7280",
                    boxShadow: `0 0 6px ${trafficColors[src.status] ?? "#6b7280"}`,
                  }}
                  title={trafficLabels[src.status]}
                />
                <span style={styles.sourceName}>{src.source}</span>
                <span style={styles.statusBadge}>
                  {trafficLabels[src.status] ?? src.status}
                </span>
              </div>
              <div style={styles.cardBody}>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>Last run</span>
                  <span style={styles.statValue}>{timeAgo(src.lastRun)}</span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>Status</span>
                  <span style={styles.statValue}>{src.lastStatus}</span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>Items</span>
                  <span style={styles.statValue}>{src.itemsFound}</span>
                </div>
              </div>
              {src.recentRuns.length > 1 && (
                <div style={styles.runHistory}>
                  <span style={styles.runHistoryLabel}>Recent runs:</span>
                  <div style={styles.runDots}>
                    {src.recentRuns.map((run, i) => (
                      <div
                        key={i}
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background:
                            run.status === "error"
                              ? "#ef4444"
                              : run.status === "empty"
                                ? "#eab308"
                                : "#22c55e",
                        }}
                        title={`${run.status} - ${run.itemsFound} items - ${timeAgo(run.startedAt)}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {data.sources.length === 0 && (
            <div style={styles.empty}>No scrape runs found yet. Trigger a scrape first.</div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 600,
    margin: "0 auto",
    padding: "16px 16px 80px",
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: "#f3f4f6",
    margin: 0,
  },
  subtitle: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 4,
    display: "block",
  },
  error: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: 8,
    padding: "10px 14px",
    color: "#fca5a5",
    fontSize: 14,
    marginBottom: 12,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  card: {
    background: "#1f2937",
    borderRadius: 12,
    padding: "14px 16px",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  trafficDot: {
    width: 16,
    height: 16,
    borderRadius: "50%",
    flexShrink: 0,
  },
  sourceName: {
    fontWeight: 600,
    fontSize: 16,
    color: "#f3f4f6",
    textTransform: "capitalize" as const,
    flex: 1,
  },
  statusBadge: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: 500,
  },
  cardBody: {
    display: "flex",
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTop: "1px solid #374151",
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#6b7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  statValue: {
    fontSize: 14,
    color: "#d1d5db",
    fontWeight: 500,
  },
  runHistory: {
    marginTop: 10,
    paddingTop: 8,
    borderTop: "1px solid #374151",
  },
  runHistoryLabel: {
    fontSize: 11,
    color: "#6b7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  runDots: {
    display: "flex",
    gap: 4,
    marginTop: 6,
    flexWrap: "wrap" as const,
  },
  empty: {
    color: "#6b7280",
    textAlign: "center",
    padding: 24,
    fontSize: 14,
  },
};
