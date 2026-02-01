import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadMonoFont } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const { fontFamily: monoFontFamily } = loadMonoFont("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
});

export const FONT_FAMILY = fontFamily;
export const MONO_FONT_FAMILY = monoFontFamily;

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 52,
  "5xl": 72,
  "6xl": 96,
  "7xl": 120,
  hero: 140,
  tagline: 96,
  wordmark: 56,
};

export const FONT_WEIGHTS = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;
