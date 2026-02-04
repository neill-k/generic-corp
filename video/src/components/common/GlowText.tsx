import React from "react";
import { FONT_FAMILY, FONT_WEIGHTS } from "../../lib/typography";
import { BRAND } from "../../lib/colors";

type GlowTextProps = {
  children: React.ReactNode;
  color?: string;
  glowColor?: string;
  fontSize?: number;
  fontWeight?: string;
  letterSpacing?: number;
  glowIntensity?: number; // 0 to 1
  style?: React.CSSProperties;
};

export const GlowText: React.FC<GlowTextProps> = ({
  children,
  color = BRAND.white,
  glowColor,
  fontSize = 64,
  fontWeight = FONT_WEIGHTS.bold,
  letterSpacing = -2,
  glowIntensity = 1,
  style,
}) => {
  // Derive glow color from text color if not specified
  const glow = glowColor ?? color;

  // Multi-layer text shadow for bloom effect
  const shadows = [
    `0 0 ${10 * glowIntensity}px ${glow}`,
    `0 0 ${30 * glowIntensity}px ${glow}44`,
    `0 0 ${60 * glowIntensity}px ${glow}22`,
    `0 0 ${100 * glowIntensity}px ${glow}11`,
  ].join(", ");

  return (
    <div
      style={{
        fontFamily: FONT_FAMILY,
        fontSize,
        fontWeight,
        color,
        letterSpacing,
        lineHeight: 1.1,
        textShadow: shadows,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
