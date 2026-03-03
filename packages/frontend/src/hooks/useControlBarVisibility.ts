import { useState, useEffect, useRef, useCallback } from "react";

interface UseControlBarVisibilityOptions {
  currentIndex: number;
}

export function useControlBarVisibility({ currentIndex }: UseControlBarVisibilityOptions) {
  const [visible, setVisible] = useState(true);
  const prevIndex = useRef(currentIndex);

  // When the paging index changes, hide the bar
  useEffect(() => {
    if (prevIndex.current !== currentIndex) {
      setVisible(false);
      prevIndex.current = currentIndex;
    }
  }, [currentIndex]);

  const showBar = useCallback(() => setVisible(true), []);
  const hideBar = useCallback(() => setVisible(false), []);

  return { visible, showBar, hideBar };
}
