import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoScroll } from "./use-auto-scroll.js";

function createMockContainer(overrides: Record<string, unknown> = {}) {
  const listeners: Record<string, EventListener[]> = {};
  return {
    scrollHeight: 1000,
    scrollTop: 950,
    clientHeight: 50,
    addEventListener: vi.fn((event: string, handler: EventListener) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event]!.push(handler);
    }),
    removeEventListener: vi.fn((event: string, handler: EventListener) => {
      if (listeners[event]) {
        listeners[event] = listeners[event]!.filter((h) => h !== handler);
      }
    }),
    fireScroll() {
      (listeners["scroll"] ?? []).forEach((h) => h(new Event("scroll")));
    },
    ...overrides,
  } as unknown as HTMLDivElement & { fireScroll: () => void };
}

describe("useAutoScroll", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("starts with isAtBottom=true", () => {
    const container = createMockContainer();
    const ref = { current: container as unknown as HTMLDivElement };

    const { result } = renderHook(() => useAutoScroll(ref, []));
    expect(result.current.isAtBottom).toBe(true);
  });

  it("detects when user is at bottom (within threshold)", () => {
    // scrollHeight(1000) - scrollTop(945) - clientHeight(50) = 5, within 50px threshold
    const container = createMockContainer({
      scrollHeight: 1000,
      scrollTop: 945,
      clientHeight: 50,
    });
    const ref = { current: container as unknown as HTMLDivElement };

    const { result } = renderHook(() => useAutoScroll(ref, []));

    act(() => {
      container.fireScroll();
    });

    expect(result.current.isAtBottom).toBe(true);
  });

  it("detects when user has scrolled up", () => {
    // Start at bottom, then simulate scrolling up
    const container = createMockContainer();
    const ref = { current: container as unknown as HTMLDivElement };

    const { result } = renderHook(() => useAutoScroll(ref, []));

    // Mutate to simulate user scrolling up
    (container as unknown as Record<string, unknown>).scrollTop = 200;

    act(() => {
      container.fireScroll();
    });

    // scrollHeight(1000) - scrollTop(200) - clientHeight(50) = 750, above threshold
    expect(result.current.isAtBottom).toBe(false);
  });

  it("scrollToBottom sets scrollTop to scrollHeight", () => {
    const container = createMockContainer({
      scrollHeight: 2000,
      scrollTop: 500,
      clientHeight: 50,
    });
    const ref = { current: container as unknown as HTMLDivElement };

    const { result } = renderHook(() => useAutoScroll(ref, []));

    act(() => {
      result.current.scrollToBottom();
    });

    expect((container as unknown as HTMLDivElement).scrollTop).toBe(2000);
  });

  it("handles null ref gracefully", () => {
    const ref = { current: null };

    const { result } = renderHook(() => useAutoScroll(ref, []));
    expect(result.current.isAtBottom).toBe(true);

    // scrollToBottom should not throw
    act(() => {
      result.current.scrollToBottom();
    });
  });

  it("registers and cleans up scroll event listener", () => {
    const container = createMockContainer();
    const ref = { current: container as unknown as HTMLDivElement };

    const { unmount } = renderHook(() => useAutoScroll(ref, []));

    expect(container.addEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
      { passive: true },
    );

    unmount();

    expect(container.removeEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
    );
  });
});
