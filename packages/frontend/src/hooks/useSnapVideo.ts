import { useState, useEffect, useCallback, useRef, type RefObject } from "react";
import type { VideoType } from "../types/feed";
import { sendCommand, sendMuteCommand } from "./useVideoAutoplay";

/* ─── Session-level mute state (persists across video cards within a session) ─── */

let sessionMuted = true;

export function getSessionMuted(): boolean {
  return sessionMuted;
}

export function setSessionMuted(muted: boolean): void {
  sessionMuted = muted;
}

/* ─── Module-level currently-playing tracker ─── */

let currentlyPlaying: {
  iframe: HTMLIFrameElement;
  videoType: VideoType;
} | null = null;

/* ─── YouTube progress via postMessage ─── */

interface YTProgressState {
  duration: number | null;
  currentTime: number;
}

/* ─── Hook ─── */

export function useSnapVideo(
  isActive: boolean,
  iframeRef: RefObject<HTMLIFrameElement | null>,
  videoType: VideoType,
) {
  const [muted, setMuted] = useState(sessionMuted);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const ytState = useRef<YTProgressState>({ duration: null, currentTime: 0 });
  const rafRef = useRef<number>(0);
  const iframeLoaded = useRef(false);

  // Sync muted state when switching between videos
  useEffect(() => {
    setMuted(sessionMuted);
  }, [isActive]);

  // Active/inactive lifecycle
  useEffect(() => {
    const iframe = iframeRef.current;

    if (isActive && iframe) {
      // Pause any other currently playing video
      if (currentlyPlaying && currentlyPlaying.iframe !== iframe) {
        sendCommand(currentlyPlaying.iframe, currentlyPlaying.videoType, "pause");
      }

      // Play this video
      sendCommand(iframe, videoType, "play");
      currentlyPlaying = { iframe, videoType };
      setIsPlaying(true);

      // Apply session mute state
      sendMuteCommand(iframe, videoType, sessionMuted);
      setMuted(sessionMuted);
    } else if (!isActive && iframe) {
      // Pause this video
      sendCommand(iframe, videoType, "pause");
      if (currentlyPlaying?.iframe === iframe) {
        currentlyPlaying = null;
      }
      setIsPlaying(false);
      setProgress(0);
    }
  }, [isActive, iframeRef, videoType]);

  // YouTube progress tracking via postMessage
  useEffect(() => {
    if (!isActive || videoType !== "youtube-short") {
      ytState.current = { duration: null, currentTime: 0 };
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube.com") return;

      let data: Record<string, unknown>;
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      if (!data || typeof data !== "object") return;

      // YouTube sends info events with playerState and currentTime
      const info = data.info as Record<string, unknown> | undefined;
      if (info && typeof info === "object") {
        if (typeof info.currentTime === "number") {
          ytState.current.currentTime = info.currentTime;
        }
        if (typeof info.duration === "number" && info.duration > 0) {
          ytState.current.duration = info.duration;
        }
      }
    };

    window.addEventListener("message", handleMessage);

    // Send "listening" message to enable YouTube player events
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "listening" }),
        "https://www.youtube.com",
      );
    }

    // Poll progress via requestAnimationFrame
    let lastUpdate = 0;
    const pollProgress = (timestamp: number) => {
      // Throttle updates to ~10fps for performance
      if (timestamp - lastUpdate > 100) {
        lastUpdate = timestamp;
        const { duration, currentTime } = ytState.current;
        if (duration && duration > 0) {
          setProgress(Math.min(currentTime / duration, 1));
        }
      }
      rafRef.current = requestAnimationFrame(pollProgress);
    };

    rafRef.current = requestAnimationFrame(pollProgress);

    return () => {
      window.removeEventListener("message", handleMessage);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [isActive, videoType, iframeRef]);

  const toggleMute = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const newMuted = !muted;
    sendMuteCommand(iframe, videoType, newMuted);
    setMuted(newMuted);
    setSessionMuted(newMuted);
  }, [muted, iframeRef, videoType]);

  const togglePlayPause = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    if (isPlaying) {
      sendCommand(iframe, videoType, "pause");
      setIsPlaying(false);
    } else {
      sendCommand(iframe, videoType, "play");
      setIsPlaying(true);
    }
  }, [isPlaying, iframeRef, videoType]);

  const onIframeLoad = useCallback(() => {
    iframeLoaded.current = true;

    // Re-send listening message after iframe loads for YouTube
    const iframe = iframeRef.current;
    if (iframe?.contentWindow && videoType === "youtube-short") {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "listening" }),
        "https://www.youtube.com",
      );
    }
  }, [iframeRef, videoType]);

  return {
    muted,
    toggleMute,
    togglePlayPause,
    isPlaying,
    progress,
    onIframeLoad,
  };
}
