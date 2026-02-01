import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../../lib/colors";

type BlinkingCaretProps = {
  color?: string;
  blinkFrames?: number;
};

export const BlinkingCaret: React.FC<BlinkingCaretProps> = ({
  color = COLORS.textPrimary,
  blinkFrames = 16,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame % blinkFrames,
    [0, blinkFrames / 2, blinkFrames],
    [1, 0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <span
      style={{
        opacity,
        color,
        fontWeight: "400",
        marginLeft: 1,
      }}
    >
      ▌
    </span>
  );
};
