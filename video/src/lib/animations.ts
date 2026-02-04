import { interpolate, spring } from "remotion";
import type { SpringConfig } from "remotion";
import { FPS } from "../data/timing";

// Spring presets
export const SPRING_CONFIGS = {
  smooth: { damping: 200 } satisfies Partial<SpringConfig>,
  snappy: { damping: 20, stiffness: 200 } satisfies Partial<SpringConfig>,
  bouncy: { damping: 8 } satisfies Partial<SpringConfig>,
  heavy: { damping: 15, stiffness: 80, mass: 2 } satisfies Partial<SpringConfig>,
  cinematic: { damping: 100, stiffness: 40, mass: 1.5 } satisfies Partial<SpringConfig>,
};

// Helper: create a spring animation
export const makeSpring = (
  frame: number,
  config: Partial<SpringConfig> = SPRING_CONFIGS.smooth,
  delay = 0,
) =>
  spring({
    frame,
    fps: FPS,
    config,
    delay,
  });

// Helper: fade in over a duration
export const fadeIn = (frame: number, startFrame: number, durationFrames: number) =>
  interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

// Helper: fade out over a duration
export const fadeOut = (frame: number, startFrame: number, durationFrames: number) =>
  interpolate(frame, [startFrame, startFrame + durationFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

// Helper: slide in from a direction
export const slideIn = (
  frame: number,
  startFrame: number,
  direction: "left" | "right" | "up" | "down",
  distance = 100,
) => {
  const progress = makeSpring(frame - startFrame, SPRING_CONFIGS.smooth);
  switch (direction) {
    case "left":
      return { x: interpolate(progress, [0, 1], [-distance, 0]), y: 0 };
    case "right":
      return { x: interpolate(progress, [0, 1], [distance, 0]), y: 0 };
    case "up":
      return { x: 0, y: interpolate(progress, [0, 1], [-distance, 0]) };
    case "down":
      return { x: 0, y: interpolate(progress, [0, 1], [distance, 0]) };
  }
};

// Camera zoom helper
export const cameraZoom = (
  frame: number,
  fromScale: number,
  toScale: number,
  startFrame: number,
  durationFrames: number,
) => {
  const progress = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const springProgress = spring({
    frame: Math.max(0, frame - startFrame),
    fps: FPS,
    config: SPRING_CONFIGS.cinematic,
  });
  return interpolate(springProgress, [0, 1], [fromScale, toScale]);
};

// Typewriter helper: returns characters to show
export const getTypedText = (
  frame: number,
  text: string,
  framesPerChar: number,
  startFrame = 0,
) => {
  const elapsed = Math.max(0, frame - startFrame);
  const charCount = Math.min(text.length, Math.floor(elapsed / framesPerChar));
  return text.slice(0, charCount);
};

// Count up from 0 to target value
export const countUp = (
  frame: number,
  target: number,
  startFrame: number,
  durationFrames: number,
) => {
  const progress = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return Math.round(target * progress);
};

// Line draw progress (0 to 1)
export const drawLine = (
  frame: number,
  startFrame: number,
  durationFrames: number,
) =>
  interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

// Stagger helper: returns opacity for item at index
export const staggeredEntry = (
  frame: number,
  index: number,
  startFrame: number,
  staggerDelay: number,
) => {
  const itemStart = startFrame + index * staggerDelay;
  return makeSpring(Math.max(0, frame - itemStart), SPRING_CONFIGS.snappy);
};
