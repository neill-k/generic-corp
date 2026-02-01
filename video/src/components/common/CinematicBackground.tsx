import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "../../lib/colors";

type GlowSource = {
  x: string; // CSS position e.g. "50%" or "30%"
  y: string;
  color: string;
  radius?: number; // percentage of viewport
  intensity?: number; // 0-1
};

type CinematicBackgroundProps = {
  glows?: GlowSource[];
  showGrid?: boolean;
  gridOpacity?: number;
  animate?: boolean;
  baseColor?: string;
  children?: React.ReactNode;
};

const DEFAULT_GLOWS: GlowSource[] = [
  { x: "50%", y: "40%", color: BRAND.red, radius: 50, intensity: 0.15 },
  { x: "20%", y: "80%", color: "rgba(96, 165, 250, 0.08)", radius: 60 },
  { x: "80%", y: "20%", color: "rgba(167, 139, 250, 0.06)", radius: 55 },
];

export const CinematicBackground: React.FC<CinematicBackgroundProps> = ({
  glows = DEFAULT_GLOWS,
  showGrid = true,
  gridOpacity = 0.04,
  animate = true,
  baseColor = "#06060C",
  children,
}) => {
  const frame = useCurrentFrame();

  // Subtle glow drift over time
  const drift = animate
    ? interpolate(frame, [0, 300], [0, 8], {
        extrapolateRight: "extend",
      })
    : 0;

  // Build radial gradient layers
  const gradientLayers = glows.map((glow, i) => {
    const offsetX = animate ? Math.sin((frame + i * 50) / 120) * drift : 0;
    const offsetY = animate ? Math.cos((frame + i * 70) / 150) * drift * 0.5 : 0;
    const r = glow.radius ?? 50;
    const intensity = glow.intensity ?? 0.1;

    return `radial-gradient(ellipse ${r}% ${r * 0.7}% at calc(${glow.x} + ${offsetX}px) calc(${glow.y} + ${offsetY}px), ${glow.color}, transparent)`;
  });

  // Subtle vignette
  const vignette =
    "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)";

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: baseColor,
        overflow: "hidden",
      }}
    >
      {/* Gradient glow layers */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: [...gradientLayers, vignette].join(", "),
        }}
      />

      {/* Subtle dot grid */}
      {showGrid && (
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: gridOpacity,
          }}
        >
          <defs>
            <pattern
              id="grid-dots"
              x="0"
              y="0"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="20" cy="20" r="0.8" fill={BRAND.white} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-dots)" />
        </svg>
      )}

      {/* Film grain overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
          mixBlendMode: "overlay",
        }}
      />

      {children}
    </div>
  );
};
