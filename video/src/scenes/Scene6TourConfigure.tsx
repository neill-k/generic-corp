import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { BRAND } from "../lib/colors";
import { FONT_SIZES, FONT_WEIGHTS } from "../lib/typography";
import { CARD_STACK_DELAY, CARD_STAGGER } from "../data/timing";
import { CONFIGURE_SECTION_LABEL, CONFIGURE_TAGLINE, CONFIGURE_CARDS } from "../data/script";
import { SectionLabel } from "../components/common/SectionLabel";
import { CardStack } from "../components/common/CardStack";
import { CinematicBackground } from "../components/common/CinematicBackground";
import { GlowText } from "../components/common/GlowText";

export const Scene6TourConfigure: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Tagline entrance
  const taglineSpring = spring({
    frame: Math.max(0, frame - 20),
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const taglineY = interpolate(taglineSpring, [0, 1], [30, 0]);

  // Slow perspective rotation on the card stack
  const stackTilt = interpolate(frame, [CARD_STACK_DELAY, 240], [4, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <CinematicBackground
        glows={[
          {
            x: "50%",
            y: "50%",
            color: "rgba(249, 115, 22, 0.08)",
            radius: 50,
          },
          {
            x: "30%",
            y: "30%",
            color: BRAND.red,
            radius: 45,
            intensity: 0.06,
          },
          {
            x: "70%",
            y: "70%",
            color: "rgba(96, 165, 250, 0.05)",
            radius: 45,
          },
        ]}
        gridOpacity={0.02}
      />

      {/* Section label */}
      <div style={{ position: "absolute", top: 50, left: 72 }}>
        <SectionLabel text={CONFIGURE_SECTION_LABEL} startFrame={5} />
      </div>

      {/* Tagline */}
      <div
        style={{
          position: "absolute",
          top: 48,
          right: 72,
          opacity: taglineSpring,
          transform: `translateY(${taglineY}px)`,
        }}
      >
        <GlowText
          fontSize={FONT_SIZES.xl}
          fontWeight={FONT_WEIGHTS.medium}
          color={BRAND.gray100}
          glowColor="rgba(240, 240, 245, 0.1)"
          glowIntensity={0.3}
        >
          {CONFIGURE_TAGLINE}
        </GlowText>
      </div>

      {/* Card stack with perspective */}
      <div
        style={{
          position: "absolute",
          top: 130,
          left: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          perspective: 1400,
        }}
      >
        <div
          style={{
            transform: `rotateX(${stackTilt}deg)`,
            transformOrigin: "center top",
          }}
        >
          <CardStack
            cards={CONFIGURE_CARDS}
            startFrame={CARD_STACK_DELAY}
            staggerFrames={CARD_STAGGER}
            cardWidth={1200}
            cardHeight={720}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
