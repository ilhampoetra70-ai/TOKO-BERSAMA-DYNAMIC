import { useCallback, useRef, useState, type TouchEvent } from 'react';

const PULL_THRESHOLD = 72;

export function usePullToRefresh(onRefresh: () => Promise<unknown> | unknown) {
  const startY = useRef(0);
  const armed = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = useCallback((event: TouchEvent<HTMLElement>) => {
    if (window.scrollY > 2 || refreshing) return;
    startY.current = event.touches[0]?.clientY ?? 0;
    armed.current = true;
  }, [refreshing]);

  const onTouchMove = useCallback((event: TouchEvent<HTMLElement>) => {
    if (!armed.current || refreshing) return;
    const currentY = event.touches[0]?.clientY ?? 0;
    const delta = currentY - startY.current;
    if (delta <= 0) {
      setPullDistance(0);
      return;
    }
    setPullDistance(Math.min(PULL_THRESHOLD, Math.round(delta * 0.42)));
  }, [refreshing]);

  const onTouchEnd = useCallback(() => {
    if (!armed.current || refreshing) return;
    armed.current = false;
    const shouldRefresh = pullDistance >= PULL_THRESHOLD - 8;
    setPullDistance(0);
    if (!shouldRefresh) return;

    setRefreshing(true);
    Promise.resolve(onRefresh()).finally(() => setRefreshing(false));
  }, [onRefresh, pullDistance, refreshing]);

  return {
    bind: { onTouchStart, onTouchMove, onTouchEnd },
    pullDistance,
    refreshing,
  };
}
