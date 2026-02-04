import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS } from "../../lib/colors";
import { FONT_FAMILY, FONT_SIZES } from "../../lib/typography";
import { makeSpring, SPRING_CONFIGS } from "../../lib/animations";

type StatusBadgeProps = {
  text: string;
  x: number;
  y: number;
  startFrame: number;
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  text,
  x,
  y,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const progress = makeSpring(
    Math.max(0, frame - startFrame),
    SPRING_CONFIGS.snappy,
  );

  if (frame < startFrame) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: x - 70,
        top: y + 65,
        opacity: progress,
        transform: `scale(${progress})`,
      }}
    >
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: FONT_SIZES.xs,
          color: COLORS.statusWorking,
          backgroundColor: `${COLORS.statusWorking}15`,
          border: `1px solid ${COLORS.statusWorking}30`,
          padding: "3px 10px",
          borderRadius: 6,
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
    </div>
  );
};
