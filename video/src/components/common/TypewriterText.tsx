import React from "react";
import { useCurrentFrame } from "remotion";
import { getTypedText } from "../../lib/animations";
import { FONT_FAMILY, FONT_SIZES, FONT_WEIGHTS } from "../../lib/typography";
import { COLORS } from "../../lib/colors";
import { BRAND } from "../../lib/colors";
import { BlinkingCaret } from "./BlinkingCaret";

type TypewriterSegment = {
  text: string;
  color: "white" | "red" | "muted";
};

type TypewriterTextProps = {
  segments: TypewriterSegment[];
  startFrame?: number;
  framesPerChar?: number;
  fontSize?: number;
  lineGap?: number;
  showCaret?: boolean;
};

const COLOR_MAP = {
  white: COLORS.textPrimary,
  red: BRAND.red,
  muted: COLORS.textSecondary,
};

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  segments,
  startFrame = 0,
  framesPerChar = 2,
  fontSize = FONT_SIZES["4xl"],
  lineGap = 12,
  showCaret = true,
}) => {
  const frame = useCurrentFrame();

  // Calculate cumulative offsets for each segment
  let cumulativeChars = 0;
  const segmentData = segments.map((seg) => {
    const segStart = startFrame + cumulativeChars * framesPerChar;
    const visibleText = getTypedText(frame, seg.text, framesPerChar, segStart);
    const isTyping = visibleText.length > 0 && visibleText.length < seg.text.length;
    const isDone = visibleText.length === seg.text.length;
    cumulativeChars += seg.text.length + 5; // +5 for inter-line pause
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: lineGap,
      }}
    >
      {segmentData.map((seg, i) => {
        if (seg.visibleText.length === 0 && !seg.isDone) return null;
        return (
          <div
            key={i}
            style={{
              fontFamily: FONT_FAMILY,
              fontSize,
              fontWeight: FONT_WEIGHTS.bold,
              color: COLOR_MAP[seg.color],
              letterSpacing: -1,
              lineHeight: 1.2,
            }}
          >
            {seg.visibleText}
            {showCaret && i === caretIndex && (
              <BlinkingCaret color={COLOR_MAP[seg.color]} />
            )}
          </div>
        );
      })}
    </div>
  );
};
