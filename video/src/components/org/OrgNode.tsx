import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS } from "../../lib/colors";
import { FONT_FAMILY, FONT_SIZES, FONT_WEIGHTS } from "../../lib/typography";
import type { AgentStatus } from "../../data/agents";

type OrgNodeProps = {
  name: string;
  title: string;
  color: string;
  x: number;
  y: number;
  status: AgentStatus;
  opacity?: number;
};

const STATUS_COLORS: Record<AgentStatus, { bg: string; glow: string }> = {
  idle: { bg: COLORS.statusIdle, glow: "transparent" },
  working: { bg: COLORS.statusWorking, glow: COLORS.glowWorking },
  complete: { bg: COLORS.statusComplete, glow: COLORS.glowComplete },
};

const NODE_SIZE = 88;

export const OrgNode: React.FC<OrgNodeProps> = ({
  name,
  title,
  color,
  x,
  y,
  status,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();
  const statusColor = STATUS_COLORS[status];

  // Pulse effect for working status
  const pulseScale =
    status === "working"
      ? 1 + 0.04 * Math.sin((frame / 30) * Math.PI * 2)
      : 1;

  // Scale entrance
  const entranceScale = Math.min(opacity * 1.05, 1);

  return (
    <div
      style={{
        position: "absolute",
        left: x - NODE_SIZE / 2 - 30,
        top: y - NODE_SIZE / 2 - 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity,
        transform: `scale(${entranceScale * pulseScale})`,
      }}
    >
      {/* Outer glow ring */}
      <div
        style={{
          width: NODE_SIZE + 16,
          height: NODE_SIZE + 16,
          borderRadius: "50%",
          position: "absolute",
          top: -8,
          left: "50%",
          transform: "translateX(-50%)",
          background:
            status !== "idle"
              ? `radial-gradient(circle, ${statusColor.glow}, transparent 70%)`
              : `radial-gradient(circle, ${color}22, transparent 70%)`,
        }}
      />

      {/* Node circle */}
      <div
        style={{
          width: NODE_SIZE,
          height: NODE_SIZE,
          borderRadius: "50%",
          backgroundColor: "rgba(20, 20, 30, 0.9)",
          border: `2.5px solid ${color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: [
            status !== "idle"
              ? `0 0 30px 8px ${statusColor.glow}`
              : `0 0 20px 4px ${color}33`,
            `inset 0 0 20px 4px ${color}11`,
          ].join(", "),
          position: "relative",
        }}
      >
        {/* Initial letter */}
        <span
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: FONT_SIZES["2xl"],
            fontWeight: FONT_WEIGHTS.bold,
            color,
            textShadow: `0 0 12px ${color}88`,
          }}
        >
          {name[0]}
        </span>

        {/* Status dot */}
        <div
          style={{
            position: "absolute",
            bottom: -3,
            right: -3,
            width: 18,
            height: 18,
            borderRadius: "50%",
            backgroundColor: statusColor.bg,
            border: `2.5px solid rgba(20, 20, 30, 0.9)`,
            boxShadow:
              status !== "idle"
                ? `0 0 10px 3px ${statusColor.glow}`
                : "none",
          }}
        />
      </div>

      {/* Name */}
      <span
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: FONT_SIZES.base,
          fontWeight: FONT_WEIGHTS.semibold,
          color: COLORS.textPrimary,
          marginTop: 10,
          whiteSpace: "nowrap",
          textShadow: "0 0 10px rgba(0,0,0,0.5)",
        }}
      >
        {name}
      </span>

      {/* Title */}
      <span
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: FONT_SIZES.sm,
          color: COLORS.textMuted,
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </span>
    </div>
  );
};
