import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from "remotion";
import { DeviceFrame } from "./DeviceFrame";

type CardStackItem = {
  label: string;
  screenshot: string;
};

type CardStackProps = {
  cards: CardStackItem[];
  startFrame?: number;
  staggerFrames?: number;
  cardWidth?: number;
  cardHeight?: number;
};

export const CardStack: React.FC<CardStackProps> = ({
  cards,
  startFrame = 0,
  staggerFrames = 30,
  cardWidth = 900,
  cardHeight = 560,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        position: "relative",
        width: cardWidth + (cards.length - 1) * 50,
        height: cardHeight + (cards.length - 1) * 40,
      }}
    >
      {cards.map((card, i) => {
        const cardStart = startFrame + i * staggerFrames;

        const progress = spring({
          frame: Math.max(0, frame - cardStart),
          fps,
          config: { damping: 12, stiffness: 90, mass: 1 },
        });

        const xOffset = i * 50;
        const yOffset = i * 40;
        const scale = interpolate(progress, [0, 1], [0.88, 1]);
        const y = interpolate(progress, [0, 1], [80, 0]);
        const rotateY = interpolate(progress, [0, 1], [8, 0]);

        return (
          <div
            key={card.label}
            style={{
              position: "absolute",
              left: xOffset,
              top: yOffset,
              opacity: progress,
              transform: `translateY(${y}px) scale(${scale}) rotateY(${rotateY}deg)`,
              transformOrigin: "center center",
              zIndex: cards.length - i,
            }}
          >
            <DeviceFrame width={cardWidth} height={cardHeight}>
              <Img
                src={staticFile(`screenshots/${card.screenshot}`)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "top left",
                }}
              />
            </DeviceFrame>
          </div>
        );
      })}
    </div>
  );
};
