import React from "react";
import { COLORS, BRAND } from "../../lib/colors";

type OrgEdgeProps = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  opacity?: number;
  active?: boolean;
};

export const OrgEdge: React.FC<OrgEdgeProps> = ({
  fromX,
  fromY,
  toX,
  toY,
  opacity = 1,
  active = false,
}) => {
  const color = active ? BRAND.red : COLORS.edgeDim;
  const nodeRadius = 44; // half of 88px node

  return (
    <>
      {/* Glow line behind */}
      {active && (
        <line
          x1={fromX}
          y1={fromY + nodeRadius}
          x2={toX}
          y2={toY - nodeRadius}
          stroke={BRAND.red}
          strokeWidth={6}
          opacity={opacity * 0.2}
          filter="url(#edge-glow)"
          strokeLinecap="round"
        />
      )}
      {/* Main line */}
      <line
        x1={fromX}
        y1={fromY + nodeRadius}
        x2={toX}
        y2={toY - nodeRadius}
        stroke={color}
        strokeWidth={active ? 2.5 : 1.5}
        opacity={opacity * 0.8}
        strokeLinecap="round"
      />
    </>
  );
};
