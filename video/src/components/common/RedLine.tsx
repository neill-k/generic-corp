import React from "react";
import { useCurrentFrame } from "remotion";
import { drawLine } from "../../lib/animations";
import { BRAND } from "../../lib/colors";

type RedLineProps = {
  startFrame?: number;
  durationFrames?: number;
  y?: number;
  thickness?: number;
};

export const RedLine: React.FC<RedLineProps> = ({
  startFrame = 0,
  durationFrames = 45,
  y = 540,
  thickness = 2,
}) => {
  const frame = useCurrentFrame();
  const progress = drawLine(frame, startFrame, durationFrames);

  if (progress <= 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: y - thickness / 2,
        left: 0,
        width: `${progress * 100}%`,
        height: thickness,
        backgroundColor: BRAND.red,
        boxShadow: `0 0 20px 4px ${BRAND.redGlow}`,
      }}
    />
  );
};
