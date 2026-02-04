import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { BRAND } from "../lib/colors";
import { FONT_FAMILY, FONT_SIZES, FONT_WEIGHTS } from "../lib/typography";
import { HOOK_TYPE_SPEED } from "../data/timing";
import { HOOK_LINES } from "../data/script";
import { CinematicBackground } from "../components/common/CinematicBackground";
import { getTypedText } from "../lib/animations";
import { BlinkingCaret } from "../components/common/BlinkingCaret";

const COLOR_MAP = {
  white: BRAND.white,
  red: BRAND.red,
  muted: BRAND.gray200,
};

const GLOW_MAP = {
  white: "rgba(240, 240, 245, 0.3)",
  red: "rgba(229, 57, 53, 0.5)",
  muted: "rgba(136, 136, 160, 0.2)",
};

export const Scene2Hook: React.FC = () => {
  const frame = useCurrentFrame();

  // Calculate cumulative offsets for each segment
  let cumulativeChars = 0;
  const segmentData = HOOK_LINES.map((seg) => {
    const segStart = 15 + cumulativeChars * HOOK_TYPE_SPEED;
    const visibleText = getTypedText(frame, seg.text, HOOK_TYPE_SPEED, segStart);
    const isTyping = visibleText.length > 0 && visibleText.length < seg.text.length;
    const isDone = visibleText.length === seg.text.length;
    cumulativeChars += seg.text.length + 5;
    return { ...seg, visibleText, isTyping, isDone };
  });

  // Show caret on the last segment that's currently typing
  let typingIndex = -1;
  let lastDoneIndex = -1;
  for (let i = segmentData.length - 1; i >= 0; i--) {
    if (typingIndex === -1 && segmentData[i].isTyping) typingIndex = i;
    if (lastDoneIndex === -1 && segmentData[i].isDone) lastDoneIndex = i;
  }
  const caretIndex = typingIndex >= 0 ? typingIndex : lastDoneIndex;

  // Background glow follows progress
  const totalChars = HOOK_LINES.reduce((sum, l) => sum + l.text.length, 0);
  const typedChars = segmentData.reduce((sum, s) => sum + s.visibleText.length, 0);
  const overallProgress = typedChars / totalChars;

  return (
    <AbsoluteFill>
      <CinematicBackground
        glows={[
          {
            x: "50%",
            y: "45%",
            color: BRAND.red,
            radius: 55,
            intensity: 0.06 + overallProgress * 0.12,
          },
          {
            x: "25%",
            y: "70%",
            color: "rgba(96, 165, 250, 0.05)",
            radius: 50,
          },
          {
            x: "75%",
            y: "30%",
            color: "rgba(167, 139, 250, 0.04)",
            radius: 45,
          },
        ]}
        gridOpacity={0.025}
      />

      {/* Typewriter text — large and centered */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        {segmentData.map((seg, i) => {
          if (seg.visibleText.length === 0 && !seg.isDone) return null;

          const textColor = COLOR_MAP[seg.color];
          const glowColor = GLOW_MAP[seg.color];

          // Each line entrance gets a subtle scale
          const lineProgress = interpolate(
            seg.visibleText.length,
            [0, 3],
            [0.95, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );

          return (
            <div
              key={i}
              style={{
                fontFamily: FONT_FAMILY,
                fontSize: FONT_SIZES.tagline,
                fontWeight: FONT_WEIGHTS.bold,
                color: textColor,
                letterSpacing: -2,
                lineHeight: 1.15,
                transform: `scale(${lineProgress})`,
                textShadow: [
                  `0 0 15px ${glowColor}`,
                  `0 0 40px ${glowColor}88`,
                  `0 0 80px ${glowColor}44`,
                ].join(", "),
              }}
            >
              {seg.visibleText}
              {i === caretIndex && (
                <BlinkingCaret color={textColor} />
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
