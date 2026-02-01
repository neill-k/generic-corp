// Video: 60 seconds at 30fps = 1800 frames
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const TOTAL_DURATION_FRAMES = FPS * 60; // 1800

// Transition duration between scenes (used by TransitionSeries)
export const TRANSITION_FRAMES = 30; // 1s fade/slide transitions

// Scene durations (in frames) — these are the "content" durations
// TransitionSeries overlaps scenes by TRANSITION_FRAMES at each boundary
// Total content = 2010f, minus 7 transitions × 30f overlap = 1800f actual
export const SCENE1_DURATION = 150;   // 5s — Dark Open
export const SCENE2_DURATION = 195;   // 6.5s — Hook
export const SCENE3_DURATION = 285;   // 9.5s — Org Chart Reveal
export const SCENE4_DURATION = 270;   // 9s — Tour: Chat
export const SCENE5_DURATION = 330;   // 11s — Tour: Orchestrate
export const SCENE6_DURATION = 240;   // 8s — Tour: Configure
export const SCENE7_DURATION = 240;   // 8s — Stats & Proof
export const SCENE8_DURATION = 300;   // 10s — CTA

// Scene-internal timing (relative to each scene's local frame 0)

// Scene 1: Dark Open
export const RED_LINE_DURATION = FPS * 1.5;  // 45f line draw
export const WORDMARK_FADE_START = FPS * 2;  // 60f before wordmark fades

// Scene 2: Hook
export const HOOK_TYPE_SPEED = 2; // frames per char
export const HOOK_LINE2_DELAY = FPS * 2; // 60f delay before "And they never sleep."
export const HOOK_PAUSE_AFTER = FPS * 1; // hold before transition

// Scene 3: Org Chart Reveal
export const ORG_USER_NODE_DELAY = FPS * 0.5; // 15f before "You" appears
export const ORG_NODE_STAGGER = FPS * 0.4;    // 12f between agent node appearances
export const ORG_EDGE_DRAW_SPEED = FPS * 0.3; // 9f per edge draw
export const ORG_STATUS_DOT_DELAY = FPS * 5;  // 150f before status dots light green
export const ORG_SUBTITLE_DELAY = FPS * 1;    // subtitle text delay

// Scene 4: Tour Chat
export const CHAT_SLIDE_DELAY = FPS * 0.5;  // 15f before screenshot slides in
export const CHAT_ZOOM_DELAY = FPS * 4;     // 120f before zoom into detail

// Scene 5: Tour Orchestrate
export const BOARD_SLIDE_DELAY = FPS * 0.5;   // 15f board screenshot entrance
export const AGENT_DETAIL_DELAY = FPS * 4;     // 120f before agent detail appears
export const STAT_COUNTER_DELAY = FPS * 6;     // 180f before stat counters

// Scene 6: Tour Configure
export const CARD_STACK_DELAY = FPS * 0.5; // 15f before first card
export const CARD_STAGGER = FPS * 1;       // 30f between card reveals

// Scene 7: Stats
export const STAT1_DELAY = FPS * 0.5;  // 15f
export const STAT2_DELAY = FPS * 2;    // 60f
export const STAT3_DELAY = FPS * 3.5;  // 105f
export const TRUST_BADGE_DELAY = FPS * 5; // 150f before trust badges

// Scene 8: CTA
export const CTA_LINE1_DELAY = FPS * 1;     // 30f
export const CTA_LINE2_DELAY = FPS * 2.5;   // 75f
export const CTA_WORDMARK_DELAY = FPS * 4.5; // 135f
export const CTA_URL_DELAY = FPS * 5.5;      // 165f
