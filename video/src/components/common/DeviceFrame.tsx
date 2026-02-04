import React from "react";
import { COLORS, BRAND } from "../../lib/colors";

type DeviceFrameProps = {
  children: React.ReactNode;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
};

export const DeviceFrame: React.FC<DeviceFrameProps> = ({
  children,
  width = 1200,
  height = 750,
  style,
}) => {
  const barHeight = 36;
  const dotSize = 10;
  const dotGap = 6;

  return (
    <div
      style={{
        width,
        borderRadius: 14,
        overflow: "hidden",
        border: `1px solid ${BRAND.gray300}`,
        boxShadow: [
          "0 32px 100px rgba(0, 0, 0, 0.7)",
          "0 12px 32px rgba(0, 0, 0, 0.5)",
          `0 0 40px 4px rgba(229, 57, 53, 0.06)`,
        ].join(", "),
        ...style,
      }}
    >
      {/* Title bar */}
      <div
        style={{
          height: barHeight,
          backgroundColor: COLORS.bgCard,
          display: "flex",
          alignItems: "center",
          paddingLeft: 14,
          gap: dotGap,
          borderBottom: `1px solid ${COLORS.borderSubtle}`,
        }}
      >
        {/* Traffic lights */}
        {["#FF5F57", "#FFBD2E", "#28C840"].map((color) => (
          <div
            key={color}
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: "50%",
              backgroundColor: color,
              opacity: 0.85,
            }}
          />
        ))}
      </div>
      {/* Content area */}
      <div
        style={{
          width,
          height: height - barHeight,
          overflow: "hidden",
          backgroundColor: COLORS.bg,
        }}
      >
        {children}
      </div>
    </div>
  );
};
