import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { MONO_FONT_FAMILY } from "../../lib/typography";
import { BRAND } from "../../lib/colors";

type SectionLabelProps = {
  text: string;
  startFrame?: number;
};

export const SectionLabel: React.FC<SectionLabelProps> = ({
  text,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 12, stiffness: 120 },
  });

  const x = interpolate(progress, [0, 1], [-40, 0]);
  const lineWidth = interpolate(progress, [0, 1], [0, 32]);

  return (
    <div
      style={{
        fontFamily: MONO_FONT_FAMILY,
        fontSize: 15,
        fontWeight: "600",
        color: BRAND.red,
        letterSpacing: 4,
        textTransform: "uppercase",
        opacity: progress,
        transform: `translateX(${x}px)`,
        display: "flex",
        alignItems: "center",
        gap: 14,
        textShadow: `0 0 10px ${BRAND.redGlow}`,
      }}
    >
      <div
        style={{
          width: lineWidth,
          height: 2,
          backgroundColor: BRAND.red,
          boxShadow: `0 0 8px 2px ${BRAND.redGlow}`,
        }}
      />
      {text}
    </div>
  );
};
