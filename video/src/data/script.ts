// Scene 1: Dark Open
export const WORDMARK_TEXT = "GENERIC CORP";

// Scene 2: Hook
export const HOOK_LINES = [
  { text: "What if you could hire", color: "white" as const },
  { text: "an entire team?", color: "white" as const },
  { text: "And they never sleep.", color: "red" as const },
];

// Scene 3: Org Chart Reveal
export const ORG_SUBTITLE = "Your AI workforce, organized.";
export const ORG_BOTTOM_TEXT = "Every role filled. Every task tracked.";

// Scene 4: Tour Chat
export const CHAT_SECTION_LABEL = "01 / CHAT";
export const CHAT_TAGLINE = "Natural language. Real results.";

// Scene 5: Tour Orchestrate
export const ORCHESTRATE_SECTION_LABEL = "02 / ORCHESTRATE";
export const ORCHESTRATE_TAGLINE = "See everything. Control everything.";

// Scene 6: Tour Configure
export const CONFIGURE_SECTION_LABEL = "03 / CONFIGURE";
export const CONFIGURE_TAGLINE = "MCP servers. Skills. Security. All configurable.";
export const CONFIGURE_CARDS = [
  { label: "MCP Servers", screenshot: "settings-mcp.png" },
  { label: "Security", screenshot: "settings-security.png" },
  { label: "Billing", screenshot: "settings-billing.png" },
];

// Scene 7: Stats & Proof
export const STATS = [
  { value: "100%", label: "Observable" },
  { value: "6", label: "Tools per agent" },
  { value: "<200ms", label: "Latency" },
];

export const TRUST_BADGES = [
  "Claude Code Runtime",
  "MCP Protocol",
  "Real-time WebSocket",
  "File-first Architecture",
];

// Scene 8: CTA
export const CTA_LINE1 = "Hire a team";
export const CTA_LINE2 = "— or a whole company.";
export const CTA_WORDMARK = "GENERIC CORP";
export const CTA_URL = "genericcorp.ai";

// Re-export for backward compatibility with existing org components
export const TAGLINE_LINE1 = CTA_LINE1;
export const TAGLINE_LINE2 = CTA_LINE2;
export const WORDMARK = CTA_WORDMARK;
