import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { BRAND } from "../lib/colors";
import { FONT_FAMILY, FONT_SIZES, FONT_WEIGHTS } from "../lib/typography";
import { SPRING_CONFIGS } from "../lib/animations";
import { RED_LINE_DURATION, WORDMARK_FADE_START } from "../data/timing";
import { WORDMARK_TEXT } from "../data/script";
import { CinematicBackground } from "../components/common/CinematicBackground";

export const Scene1DarkOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Red line draws across the center
  const lineProgress = interpolate(frame, [10, 10 + RED_LINE_DURATION], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Line glow intensifies
  const lineGlow = interpolate(frame, [10, 10 + RED_LINE_DURATION * 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Wordmark spring entrance with overshoot
  const wordmarkSpring = spring({
    frame: Math.max(0, frame - WORDMARK_FADE_START),
    fps,
    config: { damping: 12, stiffness: 80, mass: 1.2 },
  });
  const wordmarkY = interpolate(wordmarkSpring, [0, 1], [50, 0]);
  const wordmarkScale = interpolate(wordmarkSpring, [0, 1], [0.8, 1]);

  // Background glow intensifies with the line
  const bgGlowIntensity = interpolate(lineProgress, [0, 0.5, 1], [0, 0.08, 0.2]);

  return (
    <AbsoluteFill>
      <CinematicBackground
        glows={[
          {
            x: "50%",
            y: "50%",
            color: BRAND.red,
            radius: 60,
            intensity: bgGlowIntensity,
          },
          {
            x: "30%",
            y: "60%",
            color: "rgba(229, 57, 53, 0.04)",
            radius: 50,
          },
          {
            x: "70%",
            y: "40%",
            color: "rgba(167, 139, 250, 0.03)",
            radius: 45,
          },
        ]}
        showGrid
        gridOpacity={0.03}
      />

      {/* Red line — draws from left to right */}
      {lineProgress > 0 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            width: `${lineProgress * 100}%`,
            height: 3,
            backgroundColor: BRAND.red,
            boxShadow: [
              `0 0 20px 6px rgba(229, 57, 53, ${0.6 * lineGlow})`,
              `0 0 60px 20px rgba(229, 57, 53, ${0.3 * lineGlow})`,
              `0 0 120px 40px rgba(229, 57, 53, ${0.15 * lineGlow})`,
            ].join(", "),
            transform: "translateY(-50%)",
          }}
        />
      )}

      {/* GENERIC CORP wordmark */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            opacity: wordmarkSpring,
            transform: `translateY(${wordmarkY}px) scale(${wordmarkScale})`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: FONT_SIZES.wordmark,
              fontWeight: FONT_WEIGHTS.bold,
              color: BRAND.white,
              letterSpacing: 16,
              textTransform: "uppercase",
              textShadow: [
                `0 0 20px rgba(229, 57, 53, ${0.4 * wordmarkSpring})`,
                `0 0 60px rgba(229, 57, 53, ${0.2 * wordmarkSpring})`,
                `0 0 120px rgba(229, 57, 53, ${0.1 * wordmarkSpring})`,
              ].join(", "),
            }}
          >
            {WORDMARK_TEXT}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
