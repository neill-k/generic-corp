import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

type CursorProps = {
  x: number;
  y: number;
  visible?: boolean;
};

export const Cursor: React.FC<CursorProps> = ({ x, y, visible = true }) => {
  const frame = useCurrentFrame();
  const opacity = visible
    ? interpolate(frame % 30, [0, 15, 30], [1, 0.6, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 16,
        height: 16,
        borderRadius: "50%",
        backgroundColor: "white",
        boxShadow: "0 0 10px 4px rgba(255,255,255,0.3)",
        opacity,
        pointerEvents: "none",
        transform: "translate(-50%, -50%)",
      }}
    />
  );
};
