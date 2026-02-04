import React from "react";
import { useCurrentFrame } from "remotion";
import { fadeIn } from "../../lib/animations";

type FadeInProps = {
  startFrame?: number;
  durationFrames?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export const FadeIn: React.FC<FadeInProps> = ({
  startFrame = 0,
  durationFrames = 20,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const opacity = fadeIn(frame, startFrame, durationFrames);

  return (
    <div style={{ opacity, ...style }}>
      {children}
    </div>
  );
};
