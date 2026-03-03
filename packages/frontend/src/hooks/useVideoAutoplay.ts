import { useEffect, useState, type RefObject } from "react";
import type { VideoType } from "../types/feed";

/** Module-level state for one-at-a-time video enforcement */
let currentlyPlaying: {
  iframe: HTMLIFrameElement;
  videoType: VideoType;
} | null = null;

export function sendCommand(
  iframe: HTMLIFrameElement,
  videoType: VideoType,
  action: "play" | "pause",
) {
  if (videoType === "youtube-short") {
    const func = action === "play" ? "playVideo" : "pauseVideo";
    iframe.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args: [] }),
      "https://www.youtube.com",
    );
  } else {
    iframe.contentWindow?.postMessage(
      { type: action, "x-tiktok-player": true },
      "https://www.tiktok.com",
    );
  }
}

export function sendMuteCommand(
  iframe: HTMLIFrameElement,
  videoType: VideoType,
  mute: boolean,
) {
  if (videoType === "youtube-short") {
    const func = mute ? "mute" : "unMute";
    iframe.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args: [] }),
      "https://www.youtube.com",
    );
  } else {
    const type = mute ? "mute" : "unmute";
    iframe.contentWindow?.postMessage(
      { type, "x-tiktok-player": true },
      "https://www.tiktok.com",
    );
  }
}

/**
 * IntersectionObserver-driven lazy loading and autoplay.
 * Returns `inView` — iframe should only be rendered when true.
 * Handles one-at-a-time enforcement and pause/resume on scroll.
 */
export function useVideoAutoplay(
  containerRef: RefObject<HTMLDivElement | null>,
  iframeRef: RefObject<HTMLIFrameElement | null>,
  videoType: VideoType,
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          setInView(true);

          // Pause currently playing video if different
          const iframe = iframeRef.current;
          if (currentlyPlaying && currentlyPlaying.iframe !== iframe) {
            sendCommand(
              currentlyPlaying.iframe,
              currentlyPlaying.videoType,
              "pause",
            );
          }
          // Play this video (if iframe is loaded)
          if (iframe) {
            sendCommand(iframe, videoType, "play");
            currentlyPlaying = { iframe, videoType };
          }
        } else {
          const iframe = iframeRef.current;
          if (iframe && currentlyPlaying?.iframe === iframe) {
            sendCommand(iframe, videoType, "pause");
            currentlyPlaying = null;
          }
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, iframeRef, videoType]);

  return inView;
}
