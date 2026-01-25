import { db } from "../../db/index.js";
import { EventBus } from "../../services/event-bus.js";

/**
 * Get current budget information
 */
export async function budgetGet(): Promise<{
  budget: {
    remaining: number;
    limit: number;
    used: number;
    percentUsed: number;
  };
}> {
  const gameState = await db.gameState.findFirst({
    where: { playerId: "default" },
  });

  if (!gameState) {
    return {
      budget: {
        remaining: 100,
        limit: 100,
        used: 0,
        percentUsed: 0,
      },
    };
  }

  const remaining = Number(gameState.budgetRemainingUsd);
  const limit = Number(gameState.budgetLimitUsd);
  const used = limit - remaining;
  const percentUsed = limit > 0 ? (used / limit) * 100 : 0;

  return {
    budget: {
      remaining,
      limit,
      used,
      percentUsed: Math.round(percentUsed * 100) / 100,
    },
  };
}

/**
 * Update budget (with EventBus emission for UI Integration)
 * This fixes the "silent action" anti-pattern from the audit
 */
export async function budgetUpdate(params: {
  playerId: string;
  costUsd: number;
}): Promise<{ success: boolean; newBalance: number }> {
  try {
    const result = await db.$transaction(
      async (tx) => {
        const gameState = await tx.gameState.findFirst({
          where: { playerId: params.playerId },
        });

        if (!gameState) {
          return { success: false, newBalance: 0 };
        }

        const currentBalance = Number(gameState.budgetRemainingUsd);
        const newBalance = currentBalance - params.costUsd;

        if (newBalance < 0) {
          return { success: false, newBalance: currentBalance };
        }

        await tx.gameState.update({
          where: { id: gameState.id },
          data: { budgetRemainingUsd: newBalance },
        });

        return { success: true, newBalance };
      },
      {
        isolationLevel: "Serializable",
        timeout: 5000,
      }
    );

    // FIXED: Emit event for UI Integration (was missing - silent action)
    if (result.success) {
      EventBus.emit("budget:updated", {
        playerId: params.playerId,
        newBalance: result.newBalance,
        costUsd: params.costUsd,
      });
    }

    return result;
  } catch (error) {
    console.error("[Budget] Transaction failed:", error);
    return { success: false, newBalance: 0 };
  }
}
