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
import { MONO_FONT_FAMILY } from "../lib/typography";
import { SPRING_CONFIGS } from "../lib/animations";
import { STAT1_DELAY, STAT2_DELAY, STAT3_DELAY, TRUST_BADGE_DELAY } from "../data/timing";
import { STATS, TRUST_BADGES } from "../data/script";
import { CinematicBackground } from "../components/common/CinematicBackground";

export const Scene7Stats: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const statDelays = [STAT1_DELAY, STAT2_DELAY, STAT3_DELAY];

  // Trust badges
  const badgeProgress = spring({
    frame: Math.max(0, frame - TRUST_BADGE_DELAY),
    fps,
    config: SPRING_CONFIGS.smooth,
  });
  const badgeY = interpolate(badgeProgress, [0, 1], [25, 0]);

  // Background glow intensifies with stats
  const statsVisible = statDelays.filter((d) => frame > d + 15).length;
  const bgIntensity = interpolate(statsVisible, [0, 3], [0.06, 0.2]);

  return (
    <AbsoluteFill>
      <CinematicBackground
        glows={[
          {
            x: "50%",
            y: "40%",
            color: BRAND.red,
            radius: 60,
            intensity: bgIntensity,
          },
          {
            x: "20%",
            y: "60%",
            color: "rgba(96, 165, 250, 0.06)",
            radius: 50,
          },
          {
            x: "80%",
            y: "35%",
            color: "rgba(167, 139, 250, 0.05)",
            radius: 50,
          },
        ]}
        gridOpacity={0.025}
      />

      {/* Content wrapper */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 72,
        }}
      >
        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 140,
            alignItems: "flex-start",
          }}
        >
          {STATS.map((stat, i) => {
            const progress = spring({
              frame: Math.max(0, frame - statDelays[i]),
              fps,
              config: { damping: 10, stiffness: 80, mass: 1.2 },
            });
            const y = interpolate(progress, [0, 1], [60, 0]);
            const scale = interpolate(progress, [0, 1], [0.85, 1]);

            return (
              <div
                key={stat.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  opacity: progress,
                  transform: `translateY(${y}px) scale(${scale})`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: FONT_SIZES["7xl"],
                    fontWeight: FONT_WEIGHTS.bold,
                    color: BRAND.red,
                    letterSpacing: -3,
                    lineHeight: 1,
                    textShadow: [
                      `0 0 20px ${BRAND.redGlow}`,
                      `0 0 50px rgba(229, 57, 53, 0.3)`,
                      `0 0 100px rgba(229, 57, 53, 0.15)`,
                    ].join(", "),
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: FONT_SIZES["2xl"],
                    fontWeight: FONT_WEIGHTS.medium,
                    color: BRAND.gray100,
                    textTransform: "uppercase",
                    letterSpacing: 4,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Divider line with glow */}
        <div
          style={{
            width: 200,
            height: 2,
            backgroundColor: BRAND.red,
            opacity: badgeProgress * 0.6,
            boxShadow: `0 0 20px 4px ${BRAND.redGlow}`,
          }}
        />

        {/* Trust badges */}
        <div
          style={{
            display: "flex",
            gap: 24,
            opacity: badgeProgress,
            transform: `translateY(${badgeY}px)`,
          }}
        >
          {TRUST_BADGES.map((badge, i) => {
            const itemProgress = spring({
              frame: Math.max(0, frame - TRUST_BADGE_DELAY - i * 8),
              fps,
              config: SPRING_CONFIGS.snappy,
            });

            return (
              <div
                key={badge}
                style={{
                  fontFamily: MONO_FONT_FAMILY,
                  fontSize: 14,
                  fontWeight: "500",
                  color: BRAND.gray200,
                  padding: "10px 20px",
                  border: `1px solid ${BRAND.gray300}`,
                  borderRadius: 8,
                  opacity: itemProgress,
                  letterSpacing: 0.5,
                  boxShadow: `0 0 15px 2px rgba(229, 57, 53, ${0.05 * itemProgress})`,
                }}
              >
                {badge}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
