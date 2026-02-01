import React from "react";
import { useCurrentFrame } from "remotion";
import { slideIn, fadeIn } from "../../lib/animations";

type SlideInProps = {
  startFrame?: number;
  direction?: "left" | "right" | "up" | "down";
  distance?: number;
  fadeDuration?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export const SlideIn: React.FC<SlideInProps> = ({
  startFrame = 0,
  direction = "up",
  distance = 60,
  fadeDuration = 15,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const offset = slideIn(frame, startFrame, direction, distance);
  const opacity = fadeIn(frame, startFrame, fadeDuration);

  return (
    <div
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        opacity,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
