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
import { CHAT_SLIDE_DELAY, CHAT_ZOOM_DELAY } from "../data/timing";
import { CHAT_SECTION_LABEL, CHAT_TAGLINE } from "../data/script";
import { SectionLabel } from "../components/common/SectionLabel";
import { ScreenshotReveal } from "../components/common/ScreenshotReveal";
import { CinematicBackground } from "../components/common/CinematicBackground";
import { GlowText } from "../components/common/GlowText";

export const Scene4TourChat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slow cinematic zoom into screenshot
  const zoomProgress = spring({
    frame: Math.max(0, frame - CHAT_ZOOM_DELAY),
    fps,
    config: { damping: 200, stiffness: 15, mass: 2 },
  });
  const scale = interpolate(zoomProgress, [0, 1], [1, 1.08]);

  // Tagline entrance
  const taglineSpring = spring({
    frame: Math.max(0, frame - 20),
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const taglineY = interpolate(taglineSpring, [0, 1], [30, 0]);

  // Slight 3D perspective tilt on screenshot
  const tiltX = interpolate(frame, [0, 270], [2, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <CinematicBackground
        glows={[
          {
            x: "50%",
            y: "55%",
            color: "rgba(96, 165, 250, 0.12)",
            radius: 55,
          },
          {
            x: "20%",
            y: "30%",
            color: BRAND.red,
            radius: 40,
            intensity: 0.06,
          },
          {
            x: "80%",
            y: "70%",
            color: "rgba(167, 139, 250, 0.05)",
            radius: 50,
          },
        ]}
        gridOpacity={0.02}
      />

      {/* Section label */}
      <div style={{ position: "absolute", top: 50, left: 72 }}>
        <SectionLabel text={CHAT_SECTION_LABEL} startFrame={5} />
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
          {CHAT_TAGLINE}
        </GlowText>
      </div>

      {/* Screenshot with 3D perspective */}
      <div
        style={{
          position: "absolute",
          top: 110,
          left: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          perspective: 1200,
        }}
      >
        <div
          style={{
            transform: `scale(${scale}) rotateX(${tiltX}deg)`,
            transformOrigin: "center center",
          }}
        >
          <ScreenshotReveal
            src="chat-conversation.png"
            startFrame={CHAT_SLIDE_DELAY}
            direction="up"
            width={1500}
            height={860}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
