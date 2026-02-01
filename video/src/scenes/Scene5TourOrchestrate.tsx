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
import { SPRING_CONFIGS } from "../lib/animations";
import { BOARD_SLIDE_DELAY, AGENT_DETAIL_DELAY } from "../data/timing";
import { ORCHESTRATE_SECTION_LABEL, ORCHESTRATE_TAGLINE } from "../data/script";
import { SectionLabel } from "../components/common/SectionLabel";
import { ScreenshotReveal } from "../components/common/ScreenshotReveal";
import { CinematicBackground } from "../components/common/CinematicBackground";
import { GlowText } from "../components/common/GlowText";

export const Scene5TourOrchestrate: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Tagline entrance
  const taglineSpring = spring({
    frame: Math.max(0, frame - 20),
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const taglineY = interpolate(taglineSpring, [0, 1], [30, 0]);

  // Slight 3D perspective on both screenshots
  const tiltBoard = interpolate(frame, [0, 330], [3, 0], {
    extrapolateRight: "clamp",
  });
  const tiltAgent = interpolate(frame, [AGENT_DETAIL_DELAY, AGENT_DETAIL_DELAY + 200], [3, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <CinematicBackground
        glows={[
          {
            x: "35%",
            y: "55%",
            color: "rgba(167, 139, 250, 0.1)",
            radius: 50,
          },
          {
            x: "65%",
            y: "45%",
            color: "rgba(96, 165, 250, 0.08)",
            radius: 50,
          },
          {
            x: "50%",
            y: "30%",
            color: BRAND.red,
            radius: 40,
            intensity: 0.05,
          },
        ]}
        gridOpacity={0.02}
      />

      {/* Section label */}
      <div style={{ position: "absolute", top: 50, left: 72 }}>
        <SectionLabel text={ORCHESTRATE_SECTION_LABEL} startFrame={5} />
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
          {ORCHESTRATE_TAGLINE}
        </GlowText>
      </div>

      {/* Two screenshots with perspective */}
      <div
        style={{
          position: "absolute",
          top: 110,
          left: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: 28,
          padding: "0 48px",
          perspective: 1200,
        }}
      >
        {/* Board screenshot */}
        <div
          style={{
            transform: `rotateY(${tiltBoard}deg)`,
            transformOrigin: "right center",
          }}
        >
          <ScreenshotReveal
            src="board.png"
            startFrame={BOARD_SLIDE_DELAY}
            direction="left"
            width={900}
            height={700}
          />
        </div>

        {/* Agent detail screenshot */}
        <div
          style={{
            transform: `rotateY(-${tiltAgent}deg)`,
            transformOrigin: "left center",
          }}
        >
          <ScreenshotReveal
            src="agent-detail.png"
            startFrame={AGENT_DETAIL_DELAY}
            direction="right"
            width={900}
            height={700}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
