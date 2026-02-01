import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from "remotion";
import { DeviceFrame } from "./DeviceFrame";

type ScreenshotRevealProps = {
  src: string;
  startFrame?: number;
  direction?: "left" | "right" | "up";
  width?: number;
  height?: number;
  deviceFrame?: boolean;
  style?: React.CSSProperties;
};

export const ScreenshotReveal: React.FC<ScreenshotRevealProps> = ({
  src,
  startFrame = 0,
  direction = "up",
  width = 1200,
  height = 750,
  deviceFrame = true,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Snappier spring with slight overshoot
  const progress = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 14, stiffness: 100, mass: 1 },
  });

  const offsetMap = {
    left: { x: interpolate(progress, [0, 1], [-160, 0]), y: 0 },
    right: { x: interpolate(progress, [0, 1], [160, 0]), y: 0 },
    up: { x: 0, y: interpolate(progress, [0, 1], [100, 0]) },
  };

  const offset = offsetMap[direction];
  const scale = interpolate(progress, [0, 1], [0.92, 1]);

  const imgElement = (
    <Img
      src={staticFile(`screenshots/${src}`)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "top left",
      }}
    />
  );

  const content = deviceFrame ? (
    <DeviceFrame width={width} height={height}>
      {imgElement}
    </DeviceFrame>
  ) : (
    <div style={{ width, height, overflow: "hidden", borderRadius: 14 }}>
      {imgElement}
    </div>
  );

  return (
    <div
      style={{
        opacity: progress,
        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
        ...style,
      }}
    >
      {content}
    </div>
  );
};
