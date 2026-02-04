import React from "react";
import { COLORS, BRAND } from "../../lib/colors";
import { FONT_FAMILY, FONT_SIZES, FONT_WEIGHTS } from "../../lib/typography";

type UserNodeProps = {
  x: number;
  y: number;
  opacity?: number;
};

const NODE_SIZE = 72;

export const UserNode: React.FC<UserNodeProps> = ({ x, y, opacity = 1 }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: x - NODE_SIZE / 2 - 16,
        top: y - NODE_SIZE / 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity,
        transform: `scale(${Math.min(opacity * 1.05, 1)})`,
      }}
    >
      {/* Outer glow */}
      <div
        style={{
          width: NODE_SIZE + 20,
          height: NODE_SIZE + 20,
          borderRadius: "50%",
          position: "absolute",
          top: -10,
          left: "50%",
          transform: "translateX(-50%)",
          background: `radial-gradient(circle, ${BRAND.redGlow}, transparent 70%)`,
        }}
      />

      <div
        style={{
          width: NODE_SIZE,
          height: NODE_SIZE,
          borderRadius: "50%",
          backgroundColor: "rgba(20, 20, 30, 0.9)",
          border: `2.5px solid ${BRAND.red}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: [
            `0 0 30px 8px ${BRAND.redGlow}`,
            `inset 0 0 15px 3px rgba(229, 57, 53, 0.1)`,
          ].join(", "),
        }}
      >
        <span
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: FONT_SIZES.xl,
            fontWeight: FONT_WEIGHTS.bold,
            color: BRAND.white,
            textShadow: `0 0 10px ${BRAND.redGlow}`,
          }}
        >
          YOU
        </span>
      </div>
      <span
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: FONT_SIZES.sm,
          fontWeight: FONT_WEIGHTS.medium,
          color: BRAND.red,
          marginTop: 8,
          textShadow: `0 0 8px ${BRAND.redGlow}`,
        }}
      >
        CEO
      </span>
    </div>
  );
};
