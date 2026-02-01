import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../../lib/colors";
import { FONT_FAMILY, FONT_SIZES } from "../../lib/typography";

type TaskArrowProps = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  label: string;
  startFrame: number;
  durationFrames?: number;
  reverse?: boolean;
};

export const TaskArrow: React.FC<TaskArrowProps> = ({
  fromX,
  fromY,
  toX,
  toY,
  label,
  startFrame,
  durationFrames = 30,
  reverse = false,
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  if (progress <= 0) return null;

  const srcX = reverse ? toX : fromX;
  const srcY = reverse ? toY + 28 : fromY + 28;
  const dstX = reverse ? fromX : toX;
  const dstY = reverse ? fromY - 28 : toY - 28;

  // Current position of the animated dot
  const dotX = srcX + (dstX - srcX) * progress;
  const dotY = srcY + (dstY - srcY) * progress;

  // Label position at midpoint
  const midX = (srcX + dstX) / 2;
  const midY = (srcY + dstY) / 2;

  const labelOpacity = interpolate(
    progress,
    [0.1, 0.3, 0.7, 0.9],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <>
      {/* Trail line */}
      <line
        x1={srcX}
        y1={srcY}
        x2={dotX}
        y2={dotY}
        stroke={reverse ? COLORS.statusComplete : COLORS.accentBlue}
        strokeWidth={2}
        opacity={0.6}
      />

      {/* Animated dot */}
      <circle
        cx={dotX}
        cy={dotY}
        r={4}
        fill={reverse ? COLORS.statusComplete : COLORS.accentBlue}
        opacity={progress < 1 ? 1 : 0}
      />

      {/* Label */}
      <foreignObject
        x={midX - 80}
        y={midY - 20}
        width={160}
        height={40}
      >
        <div
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: FONT_SIZES.xs,
            color: COLORS.textSecondary,
            textAlign: "center",
            opacity: labelOpacity,
            backgroundColor: `${COLORS.bg}CC`,
            padding: "2px 8px",
            borderRadius: 4,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      </foreignObject>
    </>
  );
};
