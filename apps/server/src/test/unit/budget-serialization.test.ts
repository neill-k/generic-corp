import { describe, expect, it } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";

describe("Budget Serialization", () => {
  it("converts Prisma Decimal to number for JSON serialization", () => {
    // Simulate what Prisma returns
    const gameState = {
      playerId: "default",
      budgetRemainingUsd: new Decimal("100.50"),
      budgetLimitUsd: new Decimal("200.00"),
    };

    // Simulate JSON serialization (what happens over WebSocket)
    // Prisma Decimal serializes to string in JSON
    const serialized = JSON.parse(JSON.stringify(gameState));

    // After serialization, Decimal becomes a string
    expect(typeof serialized.budgetRemainingUsd).toBe("string");
    expect(typeof serialized.budgetLimitUsd).toBe("string");

    // Apply the conversion logic (same as in websocket/index.ts)
    const remaining = typeof serialized.budgetRemainingUsd === "string"
      ? parseFloat(serialized.budgetRemainingUsd)
      : Number(serialized.budgetRemainingUsd);
    const limit = typeof serialized.budgetLimitUsd === "string"
      ? parseFloat(serialized.budgetLimitUsd)
      : Number(serialized.budgetLimitUsd);

    // After conversion, should be numbers
    expect(typeof remaining).toBe("number");
    expect(typeof limit).toBe("number");
    expect(remaining).toBe(100.5);
    expect(limit).toBe(200);
  });

  it("handles Decimal values that serialize to strings", () => {
    // Some Prisma versions serialize Decimal as string
    const gameState = {
      playerId: "default",
      budgetRemainingUsd: "100.50", // String representation
      budgetLimitUsd: "200.00",
    };

    // Should convert to numbers
    const remaining = typeof gameState.budgetRemainingUsd === "string"
      ? parseFloat(gameState.budgetRemainingUsd)
      : Number(gameState.budgetRemainingUsd);
    const limit = typeof gameState.budgetLimitUsd === "string"
      ? parseFloat(gameState.budgetLimitUsd)
      : Number(gameState.budgetLimitUsd);

    expect(typeof remaining).toBe("number");
    expect(typeof limit).toBe("number");
    expect(remaining).toBe(100.5);
    expect(limit).toBe(200);
  });
});
