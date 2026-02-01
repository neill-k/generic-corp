import React from "react";
import { useCurrentFrame } from "remotion";
import { countUp } from "../../lib/animations";
import { FONT_FAMILY, FONT_SIZES, FONT_WEIGHTS } from "../../lib/typography";
import { COLORS } from "../../lib/colors";

type CountUpProps = {
  target: number;
  startFrame?: number;
  durationFrames?: number;
  prefix?: string;
  suffix?: string;
  fontSize?: number;
  color?: string;
};

export const CountUp: React.FC<CountUpProps> = ({
  target,
  startFrame = 0,
  durationFrames = 45,
  prefix = "",
  suffix = "",
  fontSize = FONT_SIZES["5xl"],
  color = COLORS.textPrimary,
}) => {
  const frame = useCurrentFrame();
  const value = countUp(frame, target, startFrame, durationFrames);

  return (
    <span
      style={{
        fontFamily: FONT_FAMILY,
        fontSize,
        fontWeight: FONT_WEIGHTS.bold,
        color,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {prefix}{value}{suffix}
    </span>
  );
};
