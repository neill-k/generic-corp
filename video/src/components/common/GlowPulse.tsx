import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

type GlowPulseProps = {
  color: string;
  intensity?: number;
  speed?: number;
  children: React.ReactNode;
};

export const GlowPulse: React.FC<GlowPulseProps> = ({
  color,
  intensity = 1,
  speed = 1,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cycleFrames = (fps * 2) / speed;
  const pulse = interpolate(
    frame % cycleFrames,
    [0, cycleFrames / 2, cycleFrames],
    [0.4, 1, 0.4],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const blur = 20 * intensity * pulse;
  const spread = 8 * intensity * pulse;

  return (
    <div
      style={{
        boxShadow: `0 0 ${blur}px ${spread}px ${color}`,
        borderRadius: "50%",
        display: "inline-flex",
      }}
    >
      {children}
    </div>
  );
};
