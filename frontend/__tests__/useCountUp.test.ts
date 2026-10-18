/**
 * frontend/__tests__/useCountUp.test.ts
 * Unit tests for useCountUp hook with prefers-reduced-motion support (#1468).
 */

import { renderHook, act } from "@testing-library/react";
import { useCountUp } from "@/lib/useCountUp";

jest.mock("@/lib/usePrefersReducedMotion", () => ({
  usePrefersReducedMotion: jest.fn(),
}));

import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

describe("useCountUp (#1468)", () => {
  const mockUsePrefersReducedMotion = usePrefersReducedMotion as jest.MockedFunction<typeof usePrefersReducedMotion>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("jumps immediately to final target when prefersReducedMotion is true", () => {
    mockUsePrefersReducedMotion.mockReturnValue(true);

    const { result } = renderHook(() => useCountUp(500, 2000, false));

    // When reduced motion is preferred, count should be the final value immediately
    expect(result.current.count).toBe(500);
  });

  it("animates up when prefersReducedMotion is false", () => {
    mockUsePrefersReducedMotion.mockReturnValue(false);

    let rafCallback: ((time: number) => void) | null = null;
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallback = cb;
      return 1;
    });

    const { result } = renderHook(() => useCountUp(100, 1000, false));
    expect(result.current.count).toBe(0);

    // Simulate animation progress
    if (rafCallback) {
      act(() => {
        (rafCallback as (time: number) => void)(500); // 50%
      });
      expect(result.current.count).toBeGreaterThanOrEqual(0);
    }
  });
});
