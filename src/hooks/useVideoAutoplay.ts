import { useEffect, type RefObject } from "react";
import type { VideoType } from "../types/feed";

/** Module-level state for one-at-a-time video enforcement */
let currentlyPlaying: {
  iframe: HTMLIFrameElement;
  videoType: VideoType;
} | null = null;

function sendCommand(
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
 * IntersectionObserver-driven autoplay with one-video-at-a-time enforcement.
 * Plays the video when >= 50% visible, pauses when it scrolls away.
 * Automatically pauses any previously playing video.
 */
export function useVideoAutoplay(
  containerRef: RefObject<HTMLDivElement | null>,
  iframeRef: RefObject<HTMLIFrameElement | null>,
  videoType: VideoType,
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          // Pause currently playing video if it's a different one
          if (currentlyPlaying && currentlyPlaying.iframe !== iframe) {
            sendCommand(
              currentlyPlaying.iframe,
              currentlyPlaying.videoType,
              "pause",
            );
          }
          // Play this video
          sendCommand(iframe, videoType, "play");
          currentlyPlaying = { iframe, videoType };
        } else if (currentlyPlaying?.iframe === iframe) {
          // This video scrolled away -- pause it
          sendCommand(iframe, videoType, "pause");
          currentlyPlaying = null;
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, iframeRef, videoType]);
}
