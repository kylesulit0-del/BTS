import { useRef, useState, useCallback, type CSSProperties, type TouchEvent, type MutableRefObject } from "react";

const DEAD_ZONE = 10;
const SWIPE_THRESHOLD = 120;
const AXIS_LOCK_RATIO = 1.5;

export interface SwipeHandlers {
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: () => void;
}

interface UseSwipeGestureReturn {
  handlers: SwipeHandlers;
  style: CSSProperties;
  swiping: boolean;
}

export function useSwipeGesture(
  onSwipeRight: () => void,
  _sourceColor?: string,
  gestureClaimedRef?: MutableRefObject<"vertical" | "horizontal" | null>,
): UseSwipeGestureReturn {
  const startX = useRef(0);
  const startY = useRef(0);
  const deltaXRef = useRef(0);
  const isSwipingRef = useRef(false);
  const axisLockedRef = useRef(false);

  const [deltaX, setDeltaX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [animating, setAnimating] = useState(false);

  const reset = useCallback(() => {
    startX.current = 0;
    startY.current = 0;
    deltaXRef.current = 0;
    isSwipingRef.current = false;
    axisLockedRef.current = false;
    setDeltaX(0);
    setSwiping(false);
  }, []);

  const onTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    deltaXRef.current = 0;
    isSwipingRef.current = false;
    axisLockedRef.current = false;
    setAnimating(false);
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;

    // Axis locking: determine if this is horizontal or vertical
    if (!axisLockedRef.current && Math.abs(dx) > DEAD_ZONE) {
      // If vertical paging already claimed the gesture, bail
      if (gestureClaimedRef?.current === "vertical") {
        axisLockedRef.current = true;
        isSwipingRef.current = false;
        return;
      }

      if (Math.abs(dx) > Math.abs(dy) * AXIS_LOCK_RATIO) {
        // Horizontal swipe claimed
        isSwipingRef.current = true;
        axisLockedRef.current = true;
        if (gestureClaimedRef) gestureClaimedRef.current = "horizontal";
        setSwiping(true);
      } else {
        // Vertical scroll dominates - do NOT claim
        axisLockedRef.current = true;
        isSwipingRef.current = false;
      }
    }

    if (isSwipingRef.current) {
      // Only allow right direction
      const clampedDx = Math.max(0, dx);
      deltaXRef.current = clampedDx;
      setDeltaX(clampedDx);
    }
  }, [gestureClaimedRef]);

  const onTouchEnd = useCallback(() => {
    if (!isSwipingRef.current) {
      reset();
      return;
    }

    if (deltaXRef.current > SWIPE_THRESHOLD) {
      // Swipe completed - animate off-screen then trigger callback
      setAnimating(true);
      setDeltaX(window.innerWidth);

      setTimeout(() => {
        onSwipeRight();
        setAnimating(false);
        reset();
      }, 300);
    } else {
      // Spring back
      setAnimating(true);
      setDeltaX(0);
      setSwiping(false);

      setTimeout(() => {
        setAnimating(false);
        reset();
      }, 300);
    }

    isSwipingRef.current = false;
    axisLockedRef.current = false;
  }, [onSwipeRight, reset]);

  const style: CSSProperties = {
    transform: deltaX > 0 ? `translateX(${deltaX}px)` : undefined,
    transition: animating ? "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)" : undefined,
    willChange: swiping ? "transform" : undefined,
  };

  return {
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
    style,
    swiping,
  };
}
