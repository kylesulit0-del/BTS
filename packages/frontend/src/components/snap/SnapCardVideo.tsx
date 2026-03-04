import { useRef, useState, useCallback } from "react";
import type { FeedItem, VideoType } from "../../types/feed";
import { useSnapVideo } from "../../hooks/useSnapVideo";
import { InfoPanel } from "./SnapCard";

const TAP_MAX_DISTANCE = 10; // px — beyond this, it's a swipe not a tap
const TAP_MAX_DURATION = 300; // ms — beyond this, it's a long press not a tap

interface SnapCardVideoProps {
  item: FeedItem;
  isActive: boolean;
}

function getVideoType(item: FeedItem): VideoType {
  if (item.videoType) return item.videoType;
  // YouTube source fallback
  return "youtube-short";
}

function getVideoId(item: FeedItem): string | null {
  if (item.videoId) return item.videoId;
  // Try to extract from YouTube URL
  if (item.source === "youtube" && item.url) {
    const match = item.url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:shorts\/|watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/,
    );
    return match?.[1] ?? null;
  }
  return null;
}

function buildIframeSrc(videoType: VideoType, videoId: string): string {
  if (videoType === "youtube-short") {
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&mute=1&loop=1&playlist=${videoId}&playsinline=1&rel=0&controls=0&origin=${encodeURIComponent(window.location.origin)}`;
  }
  return `https://www.tiktok.com/player/v1/${videoId}?autoplay=1&loop=1&controls=1&progress_bar=1&play_button=1&volume_control=1&music_info=0&description=0&rel=0`;
}

export default function SnapCardVideo({ item, isActive }: SnapCardVideoProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [tapIcon, setTapIcon] = useState<'play' | 'pause' | null>(null);
  const tapIconTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const videoType = getVideoType(item);
  const videoId = getVideoId(item);

  const { muted, toggleMute, togglePlayPause, isPlaying, progress, onIframeLoad } =
    useSnapVideo(isActive, iframeRef, videoType);

  const handleTap = useCallback(() => {
    togglePlayPause();
    // After toggling, show the NEW state icon:
    // If was playing, we just paused -> show 'pause' icon
    // If was paused, we just played -> show 'play' icon
    setTapIcon(isPlaying ? 'pause' : 'play');
    if (tapIconTimeoutRef.current) clearTimeout(tapIconTimeoutRef.current);
    tapIconTimeoutRef.current = setTimeout(() => setTapIcon(null), 800);
  }, [togglePlayPause, isPlaying]);

  const handleOverlayTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
  }, []);

  const handleOverlayTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = Math.abs(touch.clientX - touchStartRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);
    const dt = Date.now() - touchStartRef.current.t;
    touchStartRef.current = null;
    if (dx < TAP_MAX_DISTANCE && dy < TAP_MAX_DISTANCE && dt < TAP_MAX_DURATION) {
      handleTap();
    }
  }, [handleTap]);

  const handleIframeLoad = () => {
    setIframeLoaded(true);
    onIframeLoad();
  };

  // When not active or no video ID, show facade
  if (!isActive || !videoId) {
    return (
      <div className="snap-card-video">
        <div className="snap-card-media-zone">
          <div
            className="snap-card-video-facade"
            style={
              item.thumbnail
                ? { backgroundImage: `url(${item.thumbnail})` }
                : { background: "linear-gradient(135deg, #1a1a2e, #0d0d0d)" }
            }
          >
            <div className="snap-card-video-play-icon">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="32" fill="rgba(0,0,0,0.5)" />
                <polygon points="26,20 26,44 46,32" fill="white" />
              </svg>
            </div>
          </div>
        </div>
        <InfoPanel item={item} />
      </div>
    );
  }

  // Active state: render iframe
  const src = buildIframeSrc(videoType, videoId);

  return (
    <div className="snap-card-video">
      <div className="snap-card-media-zone">
        {/* Loading state: thumbnail + spinner while iframe loads */}
        {!iframeLoaded && (
          <div className="snap-card-video-facade snap-card-video-loading">
            {item.thumbnail ? (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundImage: `url(${item.thumbnail})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  position: "absolute",
                  inset: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "linear-gradient(135deg, #1a1a2e, #0d0d0d)",
                  position: "absolute",
                  inset: 0,
                }}
              />
            )}
            <div className="video-embed-spinner" />
          </div>
        )}

        {/* Iframe */}
        <iframe
          ref={iframeRef}
          src={src}
          title={item.title}
          allow="autoplay; encrypted-media"
          allowFullScreen
          onLoad={handleIframeLoad}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            border: "none",
            opacity: iframeLoaded ? 1 : 0,
            zIndex: 1,
          }}
        />

        {/* Touch overlay - intercepts touch events from cross-origin iframe */}
        <div
          className="snap-video-touch-overlay"
          onTouchStart={handleOverlayTouchStart}
          onTouchEnd={handleOverlayTouchEnd}
        />

        {/* Play/pause tap feedback icon */}
        {tapIcon && (
          <div className="snap-video-tap-icon" key={tapIcon}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="32" fill="rgba(0,0,0,0.5)" />
              {tapIcon === 'play' ? (
                <polygon points="26,20 26,44 46,32" fill="white" />
              ) : (
                <g fill="white">
                  <rect x="22" y="20" width="8" height="24" rx="2" />
                  <rect x="34" y="20" width="8" height="24" rx="2" />
                </g>
              )}
            </svg>
          </div>
        )}

        {/* Mute/unmute button - bottom right */}
        <button
          className="snap-card-video-mute-btn"
          aria-label={muted ? "Unmute" : "Mute"}
          onClick={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
        >
          {muted ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M3.63 3.63a.996.996 0 000 1.41L7.29 8.7 7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91-.36.15-.58.53-.58.92 0 .72.73 1.18 1.39.91.8-.33 1.55-.77 2.22-1.31l1.34 1.34a.996.996 0 101.41-1.41L5.05 3.63c-.39-.39-1.02-.39-1.42 0zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87 0-3.83-2.4-7.11-5.78-8.4-.59-.23-1.22.23-1.22.86v.19c0 .38.25.71.61.85C17.18 6.54 19 9.06 19 12zm-8.71-6.29l-.17.17L12 7.76V6.41c0-.89-1.08-1.34-1.71-.7zM16.5 12A4.5 4.5 0 0014 7.97v1.79l2.48 2.48c.01-.08.02-.16.02-.24z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-3.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          )}
        </button>

        {/* Custom progress bar - YouTube only */}
        {videoType === "youtube-short" && iframeLoaded && (
          <div className="snap-video-progress">
            <div
              className="snap-video-progress-fill"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Info panel - below media zone */}
      <InfoPanel item={item} />
    </div>
  );
}
