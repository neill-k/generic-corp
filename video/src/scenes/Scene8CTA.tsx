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
import { SPRING_CONFIGS, fadeIn } from "../lib/animations";
import {
  CTA_LINE1_DELAY,
  CTA_LINE2_DELAY,
  CTA_WORDMARK_DELAY,
  CTA_URL_DELAY,
} from "../data/timing";
import { CTA_LINE1, CTA_LINE2, CTA_WORDMARK, CTA_URL } from "../data/script";
import { ORG_POSITIONS } from "../data/org-layout";
import { CinematicBackground } from "../components/common/CinematicBackground";

export const Scene8CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "Hire a team" — spring entrance with overshoot
  const line1Spring = spring({
    frame: Math.max(0, frame - CTA_LINE1_DELAY),
    fps,
    config: { damping: 10, stiffness: 80, mass: 1.3 },
  });
  const line1Y = interpolate(line1Spring, [0, 1], [60, 0]);
  const line1Scale = interpolate(line1Spring, [0, 1], [0.85, 1]);

  // "— or a whole company." — spring entrance
  const line2Spring = spring({
    frame: Math.max(0, frame - CTA_LINE2_DELAY),
    fps,
    config: { damping: 10, stiffness: 80, mass: 1.3 },
  });
  const line2Y = interpolate(line2Spring, [0, 1], [50, 0]);
  const line2Scale = interpolate(line2Spring, [0, 1], [0.85, 1]);

  // Wordmark
  const wordmarkSpring = spring({
    frame: Math.max(0, frame - CTA_WORDMARK_DELAY),
    fps,
    config: SPRING_CONFIGS.cinematic,
  });
  const wordmarkY = interpolate(wordmarkSpring, [0, 1], [25, 0]);

  // URL
  const urlProgress = fadeIn(frame, CTA_URL_DELAY, 30);

  // Background glow builds with the CTA
  const bgIntensity = interpolate(
    frame,
    [CTA_LINE1_DELAY, CTA_LINE2_DELAY + 30],
    [0.05, 0.22],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Org chart silhouette
  const silhouetteOpacity = fadeIn(frame, 15, 60) * 0.06;

  return (
    <AbsoluteFill>
      <CinematicBackground
        glows={[
          {
            x: "50%",
            y: "42%",
            color: BRAND.red,
            radius: 65,
            intensity: bgIntensity,
          },
          {
            x: "25%",
            y: "65%",
            color: "rgba(96, 165, 250, 0.05)",
            radius: 50,
          },
          {
            x: "75%",
            y: "25%",
            color: "rgba(167, 139, 250, 0.04)",
            radius: 50,
          },
        ]}
        gridOpacity={0.025}
      />

      {/* Org chart silhouette in background */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: silhouetteOpacity,
          pointerEvents: "none",
        }}
      >
        {ORG_POSITIONS.map((pos) => (
          <circle
            key={pos.id}
            cx={pos.x}
            cy={pos.y}
            r={44}
            fill={BRAND.white}
          />
        ))}
      </svg>

      {/* CTA content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Tagline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          {/* Line 1 */}
          <div
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: FONT_SIZES.hero,
              fontWeight: FONT_WEIGHTS.bold,
              color: BRAND.white,
              opacity: line1Spring,
              transform: `translateY(${line1Y}px) scale(${line1Scale})`,
              letterSpacing: -3,
              lineHeight: 1.05,
              textShadow: [
                `0 0 20px rgba(240, 240, 245, 0.2)`,
                `0 0 60px rgba(229, 57, 53, 0.15)`,
                `0 0 120px rgba(229, 57, 53, 0.08)`,
              ].join(", "),
            }}
          >
            {CTA_LINE1}
          </div>

          {/* Line 2 */}
          <div
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: FONT_SIZES.hero,
              fontWeight: FONT_WEIGHTS.bold,
              color: BRAND.red,
              opacity: line2Spring,
              transform: `translateY(${line2Y}px) scale(${line2Scale})`,
              letterSpacing: -3,
              lineHeight: 1.05,
              textShadow: [
                `0 0 25px ${BRAND.redGlow}`,
                `0 0 60px rgba(229, 57, 53, 0.3)`,
                `0 0 120px rgba(229, 57, 53, 0.15)`,
              ].join(", "),
            }}
          >
            {CTA_LINE2}
          </div>
        </div>

        {/* Wordmark */}
        <div
          style={{
            marginTop: 72,
            opacity: wordmarkSpring,
            transform: `translateY(${wordmarkY}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: FONT_SIZES.wordmark,
              fontWeight: FONT_WEIGHTS.semibold,
              color: BRAND.gray200,
              letterSpacing: 8,
              textShadow: `0 0 30px rgba(229, 57, 53, ${0.15 * wordmarkSpring})`,
            }}
          >
            {CTA_WORDMARK}
          </div>
        </div>

        {/* URL */}
        <div
          style={{
            marginTop: 28,
            opacity: urlProgress,
          }}
        >
          <div
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: FONT_SIZES.xl,
              fontWeight: FONT_WEIGHTS.normal,
              color: BRAND.red,
              letterSpacing: 3,
              textShadow: `0 0 15px ${BRAND.redGlow}`,
            }}
          >
            {CTA_URL}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
