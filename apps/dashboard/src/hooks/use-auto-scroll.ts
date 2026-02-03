import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject, DependencyList } from "react";

const AT_BOTTOM_THRESHOLD = 50;

interface UseAutoScrollReturn {
  isAtBottom: boolean;
  scrollToBottom: () => void;
}

export function useAutoScroll(
  containerRef: RefObject<HTMLDivElement | null>,
  deps: DependencyList = [],
): UseAutoScrollReturn {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const isAtBottomRef = useRef(true);

  const checkIfAtBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= AT_BOTTOM_THRESHOLD;
  }, [containerRef]);

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    isAtBottomRef.current = true;
    setIsAtBottom(true);
  }, [containerRef]);

  // Track scroll position
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const atBottom = checkIfAtBottom();
      isAtBottomRef.current = atBottom;
      setIsAtBottom(atBottom);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [containerRef, checkIfAtBottom]);

  // Auto-scroll when content changes and user is at bottom
  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom();
    }
  }, deps); // deps is intentionally spread from caller

  return { isAtBottom, scrollToBottom };
}
