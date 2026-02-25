/**
 * Skeleton loading placeholder that mimics FeedCard shape.
 * Uses CSS pulse animation on neutral gray blocks.
 */
export default function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-card-image" />
      <div className="skeleton-card-body">
        <div className="skeleton-card-meta" />
        <div className="skeleton-card-title" />
        <div className="skeleton-card-line" />
        <div className="skeleton-card-line skeleton-card-line-short" />
      </div>
    </div>
  );
}
