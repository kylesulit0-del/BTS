import { useRef, useCallback, useEffect, useLayoutEffect } from "react";
import {
  PAGING_DEAD_ZONE,
  PAGING_AXIS_LOCK_RATIO,
  PAGING_DISTANCE_RATIO,
  PAGING_VELOCITY_THRESHOLD,
  PAGING_SPRING_DURATION,
  PAGING_SPRING_EASING,
} from "../config/snap";

interface UseVerticalPagingOptions {
  onCommitNext: () => void;
  onCommitPrev: () => void;
  enabled: boolean;
  currentIndex: number;
}

export function useVerticalPaging({ onCommitNext, onCommitPrev, enabled, currentIndex }: UseVerticalPagingOptions) {
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gestureClaimedRef = useRef<"vertical" | "horizontal" | null>(null);

  const isDraggingRef = useRef(false);
  const startY = useRef(0);
  const startX = useRef(0);
  const currentOffset = useRef(0);
  const axisLocked = useRef(false);
  const touchHistory = useRef<{ t: number; y: number }[]>([]);
  const pendingCommit = useRef<"next" | "prev" | null>(null);
  const animatingRef = useRef(false);

  const setTrackTransform = useCallback((offset: number, animate: boolean) => {
    const track = trackRef.current;
    if (!track) return;
    if (animate) {
      track.style.transition = `transform ${PAGING_SPRING_DURATION}ms ${PAGING_SPRING_EASING}`;
    } else {
      track.style.transition = "none";
    }
    track.style.transform = `translateY(${offset}px)`;
  }, []);

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || animatingRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    startY.current = touch.clientY;
    startX.current = touch.clientX;
    currentOffset.current = 0;
    axisLocked.current = false;
    isDraggingRef.current = false;
    gestureClaimedRef.current = null;
    touchHistory.current = [{ t: e.timeStamp, y: touch.clientY }];
  }, [enabled]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || animatingRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;

    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;

    if (!axisLocked.current) {
      if (Math.abs(dy) < PAGING_DEAD_ZONE && Math.abs(dx) < PAGING_DEAD_ZONE) return;

      if (Math.abs(dy) > Math.abs(dx) * PAGING_AXIS_LOCK_RATIO) {
        // Vertical wins
        if (gestureClaimedRef.current === "horizontal") return;
        axisLocked.current = true;
        isDraggingRef.current = true;
        gestureClaimedRef.current = "vertical";
      } else {
        // Horizontal wins or ambiguous — bail
        axisLocked.current = true;
        isDraggingRef.current = false;
        return;
      }
    }

    if (!isDraggingRef.current) return;

    currentOffset.current = dy;
    setTrackTransform(dy, false);

    // Keep last ~50ms of touches for velocity
    touchHistory.current.push({ t: e.timeStamp, y: touch.clientY });
    const cutoff = e.timeStamp - 80;
    while (touchHistory.current.length > 2 && touchHistory.current[0].t < cutoff) {
      touchHistory.current.shift();
    }
  }, [enabled, setTrackTransform]);

  const onTouchEnd = useCallback(() => {
    if (!isDraggingRef.current) {
      gestureClaimedRef.current = null;
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const height = container.clientHeight;
    const offset = currentOffset.current;

    // Calculate velocity from touch history
    let velocity = 0;
    const history = touchHistory.current;
    if (history.length >= 2) {
      const first = history[0];
      const last = history[history.length - 1];
      const dt = last.t - first.t;
      if (dt > 0) {
        velocity = (last.y - first.y) / dt; // px/ms, negative = swiping up
      }
    }

    const absOffset = Math.abs(offset);
    const absVelocity = Math.abs(velocity);

    const shouldCommit =
      absOffset > height * PAGING_DISTANCE_RATIO || absVelocity > PAGING_VELOCITY_THRESHOLD;

    if (shouldCommit && offset < 0) {
      // Swipe up → next
      pendingCommit.current = "next";
      animatingRef.current = true;
      setTrackTransform(-height, true);
    } else if (shouldCommit && offset > 0) {
      // Swipe down → prev
      pendingCommit.current = "prev";
      animatingRef.current = true;
      setTrackTransform(height, true);
    } else {
      // Bounce back
      pendingCommit.current = null;
      animatingRef.current = true;
      setTrackTransform(0, true);
    }

    isDraggingRef.current = false;
  }, [setTrackTransform]);

  const onTransitionEnd = useCallback(() => {
    const commit = pendingCommit.current;
    pendingCommit.current = null;
    animatingRef.current = false;
    gestureClaimedRef.current = null;

    if (commit === "next") {
      onCommitNext();
    } else if (commit === "prev") {
      onCommitPrev();
    }
  }, [onCommitNext, onCommitPrev]);

  // Reset transform synchronously after index change
  useLayoutEffect(() => {
    setTrackTransform(0, false);
  }, [currentIndex, setTrackTransform]);

  // Attach touch listeners (non-passive for potential preventDefault)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  // Mouse wheel: discrete page advance
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    let wheelCooldown = false;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (wheelCooldown || animatingRef.current) return;
      if (Math.abs(e.deltaY) < 10) return;

      wheelCooldown = true;
      const height = container.clientHeight;

      if (e.deltaY > 0) {
        pendingCommit.current = "next";
        animatingRef.current = true;
        setTrackTransform(-height, true);
      } else {
        pendingCommit.current = "prev";
        animatingRef.current = true;
        setTrackTransform(height, true);
      }

      setTimeout(() => { wheelCooldown = false; }, PAGING_SPRING_DURATION + 50);
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [enabled, setTrackTransform]);

  return { trackRef, containerRef, gestureClaimedRef, onTransitionEnd };
}
