import { describe, expect, it } from "vitest";

import { BOARD_TYPE_TO_FOLDER, DEFAULT_AGENT_MODEL, SOFT_CONTEXT_TOKEN_LIMIT, SUMMARIZER_MODEL } from "./index.js";

describe("constants", () => {
  it("maps board item types to folders", () => {
    expect(BOARD_TYPE_TO_FOLDER.status_update).toBe("status-updates");
    expect(BOARD_TYPE_TO_FOLDER.blocker).toBe("blockers");
    expect(BOARD_TYPE_TO_FOLDER.finding).toBe("findings");
    expect(BOARD_TYPE_TO_FOLDER.request).toBe("requests");
  });

  it("defines a soft context token limit", () => {
    expect(SOFT_CONTEXT_TOKEN_LIMIT).toBeGreaterThan(0);
  });

  it("defines default models", () => {
    expect(DEFAULT_AGENT_MODEL).toBe("sonnet");
    expect(SUMMARIZER_MODEL).toBe("haiku");
  });
});
