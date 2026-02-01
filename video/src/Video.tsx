import React from "react";
import { AbsoluteFill } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { COLORS } from "./lib/colors";
import {
  TRANSITION_FRAMES,
  SCENE1_DURATION,
  SCENE2_DURATION,
  SCENE3_DURATION,
  SCENE4_DURATION,
  SCENE5_DURATION,
  SCENE6_DURATION,
  SCENE7_DURATION,
  SCENE8_DURATION,
} from "./data/timing";
import { Scene1DarkOpen } from "./scenes/Scene1DarkOpen";
import { Scene2Hook } from "./scenes/Scene2Hook";
import { Scene3OrgReveal } from "./scenes/Scene3OrgReveal";
import { Scene4TourChat } from "./scenes/Scene4TourChat";
import { Scene5TourOrchestrate } from "./scenes/Scene5TourOrchestrate";
import { Scene6TourConfigure } from "./scenes/Scene6TourConfigure";
import { Scene7Stats } from "./scenes/Scene7Stats";
import { Scene8CTA } from "./scenes/Scene8CTA";

const fadeTransition = () => (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
  />
);

const slideTransition = () => (
  <TransitionSeries.Transition
    presentation={slide({ direction: "from-right" })}
    timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
  />
);

export const Video: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <TransitionSeries>
        {/* Scene 1: Dark Open — Red line + wordmark */}
        <TransitionSeries.Sequence durationInFrames={SCENE1_DURATION}>
          <Scene1DarkOpen />
        </TransitionSeries.Sequence>

        {fadeTransition()}

        {/* Scene 2: Hook — Typewriter question */}
        <TransitionSeries.Sequence durationInFrames={SCENE2_DURATION}>
          <Scene2Hook />
        </TransitionSeries.Sequence>

        {fadeTransition()}

        {/* Scene 3: Org Chart Reveal — Cascading agents */}
        <TransitionSeries.Sequence durationInFrames={SCENE3_DURATION}>
          <Scene3OrgReveal />
        </TransitionSeries.Sequence>

        {slideTransition()}

        {/* Scene 4: Tour Chat — Screenshot showcase */}
        <TransitionSeries.Sequence durationInFrames={SCENE4_DURATION}>
          <Scene4TourChat />
        </TransitionSeries.Sequence>

        {slideTransition()}

        {/* Scene 5: Tour Orchestrate — Board + Agent detail */}
        <TransitionSeries.Sequence durationInFrames={SCENE5_DURATION}>
          <Scene5TourOrchestrate />
        </TransitionSeries.Sequence>

        {slideTransition()}

        {/* Scene 6: Tour Configure — Settings card stack */}
        <TransitionSeries.Sequence durationInFrames={SCENE6_DURATION}>
          <Scene6TourConfigure />
        </TransitionSeries.Sequence>

        {fadeTransition()}

        {/* Scene 7: Stats & Proof — Animated counters */}
        <TransitionSeries.Sequence durationInFrames={SCENE7_DURATION}>
          <Scene7Stats />
        </TransitionSeries.Sequence>

        {fadeTransition()}

        {/* Scene 8: CTA — Final tagline */}
        <TransitionSeries.Sequence durationInFrames={SCENE8_DURATION}>
          <Scene8CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
