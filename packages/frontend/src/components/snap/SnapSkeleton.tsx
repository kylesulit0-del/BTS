export default function SnapSkeleton() {
  return (
    <div className="snap-skeleton">
      <div className="snap-skeleton-block snap-skeleton-hero" />
      <div className="snap-skeleton-content">
        <div className="snap-skeleton-block snap-skeleton-title" />
        <div className="snap-skeleton-block snap-skeleton-line" />
        <div className="snap-skeleton-block snap-skeleton-line snap-skeleton-line-short" />
        <div className="snap-skeleton-block snap-skeleton-meta" />
      </div>
    </div>
  );
}
