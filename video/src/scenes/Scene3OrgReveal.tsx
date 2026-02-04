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
import { SPRING_CONFIGS, staggeredEntry } from "../lib/animations";
import { AGENTS } from "../data/agents";
import type { AgentStatus } from "../data/agents";
import { ORG_POSITIONS, ORG_EDGES, USER_POSITION } from "../data/org-layout";
import { OrgChart } from "../components/org/OrgChart";
import {
  ORG_USER_NODE_DELAY,
  ORG_NODE_STAGGER,
  ORG_STATUS_DOT_DELAY,
  ORG_SUBTITLE_DELAY,
} from "../data/timing";
import { ORG_SUBTITLE, ORG_BOTTOM_TEXT } from "../data/script";
import { CinematicBackground } from "../components/common/CinematicBackground";
import { GlowText } from "../components/common/GlowText";

const REVEAL_ORDER = ["marcus", "sable", "vivian", "marta", "noah", "priya"];

export const Scene3OrgReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "You" node opacity
  const userOpacity = spring({
    frame: Math.max(0, frame - ORG_USER_NODE_DELAY),
    fps,
    config: { damping: 10, stiffness: 120 },
  });

  // Calculate opacities for each agent node (staggered cascade)
  const nodeOpacities: Record<string, number> = { user: userOpacity };
  const agentStartFrame = ORG_USER_NODE_DELAY + 15;

  REVEAL_ORDER.forEach((id, index) => {
    nodeOpacities[id] = staggeredEntry(frame, index, agentStartFrame, ORG_NODE_STAGGER);
  });

  // Status: all start idle, then go green after ORG_STATUS_DOT_DELAY
  const nodeStatuses: Record<string, AgentStatus> = {};
  AGENTS.forEach((agent) => {
    const agentIndex = REVEAL_ORDER.indexOf(agent.id);
    const statusFrame = ORG_STATUS_DOT_DELAY + agentIndex * 6;
    nodeStatuses[agent.id] = frame > statusFrame ? "complete" : "idle";
  });

  // Subtitle text
  const subtitleProgress = spring({
    frame: Math.max(0, frame - ORG_SUBTITLE_DELAY),
    fps,
    config: SPRING_CONFIGS.smooth,
  });
  const subtitleY = interpolate(subtitleProgress, [0, 1], [30, 0]);

  // Bottom text
  const bottomProgress = spring({
    frame: Math.max(0, frame - ORG_STATUS_DOT_DELAY - 15),
    fps,
    config: SPRING_CONFIGS.smooth,
  });
  const bottomY = interpolate(bottomProgress, [0, 1], [20, 0]);

  // Background glow intensifies as nodes appear
  const nodesVisible = Object.values(nodeOpacities).filter((v) => v > 0.5).length;
  const bgIntensity = interpolate(nodesVisible, [0, 7], [0.05, 0.18]);

  return (
    <AbsoluteFill>
      <CinematicBackground
        glows={[
          {
            x: "50%",
            y: "35%",
            color: BRAND.red,
            radius: 65,
            intensity: bgIntensity,
          },
          {
            x: "30%",
            y: "65%",
            color: "rgba(96, 165, 250, 0.06)",
            radius: 50,
          },
          {
            x: "70%",
            y: "50%",
            color: "rgba(167, 139, 250, 0.04)",
            radius: 55,
          },
        ]}
        gridOpacity={0.03}
      />

      {/* Subtitle at top */}
      <div
        style={{
          position: "absolute",
          top: 40,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          opacity: subtitleProgress,
          transform: `translateY(${subtitleY}px)`,
        }}
      >
        <GlowText
          fontSize={FONT_SIZES["3xl"]}
          fontWeight={FONT_WEIGHTS.medium}
          color={BRAND.gray100}
          glowColor="rgba(240, 240, 245, 0.15)"
          glowIntensity={0.4}
        >
          {ORG_SUBTITLE}
        </GlowText>
      </div>

      {/* SVG glow filter for edges */}
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <filter id="edge-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
      </svg>

      {/* Org Chart */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <OrgChart
          nodeOpacities={nodeOpacities}
          nodeStatuses={nodeStatuses}
          showUser
          showEdges
        />
      </div>

      {/* Bottom text */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          opacity: bottomProgress,
          transform: `translateY(${bottomY}px)`,
        }}
      >
        <GlowText
          fontSize={FONT_SIZES.xl}
          fontWeight={FONT_WEIGHTS.normal}
          color={BRAND.gray200}
          glowColor="rgba(136, 136, 160, 0.15)"
          glowIntensity={0.3}
          letterSpacing={2}
        >
          {ORG_BOTTOM_TEXT}
        </GlowText>
      </div>
    </AbsoluteFill>
  );
};
