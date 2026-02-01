import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { SPRING_CONFIGS } from "../../lib/animations";
import { FONT_FAMILY, FONT_SIZES, FONT_WEIGHTS } from "../../lib/typography";
import { COLORS, BRAND } from "../../lib/colors";

type StatCardProps = {
  value: string;
  label: string;
  startFrame?: number;
};

export const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: SPRING_CONFIGS.snappy,
  });

  const y = interpolate(progress, [0, 1], [40, 0]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        opacity: progress,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: FONT_SIZES["6xl"],
          fontWeight: FONT_WEIGHTS.bold,
          color: BRAND.red,
          letterSpacing: -2,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: FONT_SIZES.xl,
          fontWeight: FONT_WEIGHTS.medium,
          color: COLORS.textSecondary,
          textTransform: "uppercase",
          letterSpacing: 3,
        }}
      >
        {label}
      </div>
    </div>
  );
};
