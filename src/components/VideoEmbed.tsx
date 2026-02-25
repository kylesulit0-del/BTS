import { useState, useRef, useEffect, useCallback } from "react";
import type { VideoType } from "../types/feed";
import { useVideoAutoplay, sendMuteCommand } from "../hooks/useVideoAutoplay";
import { fetchWithProxy } from "../utils/corsProxy";

interface VideoEmbedProps {
  videoType: VideoType;
  videoId: string;
  title: string;
  thumbnail?: string;
}

export default function VideoEmbed({
  videoType,
  videoId,
  title,
  thumbnail: initialThumbnail,
}: VideoEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [muted, setMuted] = useState(true);
  const [embedError, setEmbedError] = useState(false);
  const [thumbnail, setThumbnail] = useState(initialThumbnail);

  useVideoAutoplay(containerRef, iframeRef, videoType);

  // Fetch TikTok thumbnail via oEmbed if none provided
  useEffect(() => {
    if (videoType !== "tiktok" || initialThumbnail) return;

    let cancelled = false;
    const tiktokUrl = `https://www.tiktok.com/@/video/${videoId}`;
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(tiktokUrl)}`;

    fetchWithProxy(oembedUrl)
      .then((text) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(text);
          if (data.thumbnail_url) setThumbnail(data.thumbnail_url);
        } catch {
          // Ignore parse errors
        }
      })
      .catch(() => {
        // No thumbnail available -- spinner only
      });

    return () => {
      cancelled = true;
    };
  }, [videoType, videoId, initialThumbnail]);

  const src =
    videoType === "youtube-short"
      ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0&mute=1&loop=1&playlist=${videoId}&playsinline=1&rel=0&controls=1`
      : `https://www.tiktok.com/player/v1/${videoId}?autoplay=0&loop=1&controls=1&progress_bar=1&play_button=1&volume_control=1&music_info=0&description=0&rel=0`;

  const handleUnmute = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    sendMuteCommand(iframe, videoType, false);
    setMuted(false);
  }, [videoType]);

  // TikTok fallback when embed fails
  if (embedError && videoType === "tiktok") {
    return (
      <div
        ref={containerRef}
        className="video-embed"
        style={{ aspectRatio: "9 / 16" }}
      >
        <a
          href={`https://www.tiktok.com/@/video/${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="video-embed-fallback"
        >
          {thumbnail && <img src={thumbnail} alt={title} />}
          <span className="video-embed-fallback-label">Open in TikTok</span>
        </a>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="video-embed"
      style={{ aspectRatio: "9 / 16" }}
    >
      {/* Loading placeholder: thumbnail + spinner */}
      {!loaded && (
        <div className="video-embed-placeholder">
          {thumbnail && <img src={thumbnail} alt="" />}
          <div className="video-embed-spinner" />
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        allow="autoplay; encrypted-media"
        allowFullScreen
        onLoad={() => setLoaded(true)}
        onError={() => setEmbedError(true)}
        style={{
          opacity: loaded ? 1 : 0,
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          border: "none",
        }}
      />

      {/* Mute indicator */}
      {loaded && muted && (
        <button
          className="video-embed-mute-btn"
          onClick={handleUnmute}
          aria-label="Tap to unmute"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="currentColor"
          >
            <path d="M3.63 3.63a.996.996 0 000 1.41L7.29 8.7 7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91-.36.15-.58.53-.58.92 0 .72.73 1.18 1.39.91.8-.33 1.55-.77 2.22-1.31l1.34 1.34a.996.996 0 101.41-1.41L5.05 3.63c-.39-.39-1.02-.39-1.42 0zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87 0-3.83-2.4-7.11-5.78-8.4-.59-.23-1.22.23-1.22.86v.19c0 .38.25.71.61.85C17.18 6.54 19 9.06 19 12zm-8.71-6.29l-.17.17L12 7.76V6.41c0-.89-1.08-1.34-1.71-.7zM16.5 12A4.5 4.5 0 0014 7.97v1.79l2.48 2.48c.01-.08.02-.16.02-.24z" />
          </svg>
        </button>
      )}
    </div>
  );
}
