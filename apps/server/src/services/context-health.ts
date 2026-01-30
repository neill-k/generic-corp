import { readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_TOKEN_LIMIT = 6000;
const CHARS_PER_TOKEN = 4;

export async function checkContextHealth(
  workspacePath: string,
  tokenLimit: number = DEFAULT_TOKEN_LIMIT,
): Promise<string | null> {
  const contextPath = path.join(workspacePath, ".gc", "context.md");

  let content: string;
  try {
    content = await readFile(contextPath, "utf8");
  } catch {
    return null;
  }

  const estimatedTokens = Math.round(content.length / CHARS_PER_TOKEN);

  if (estimatedTokens <= tokenLimit) {
    return null;
  }

  return `Warning: your context.md is ~${estimatedTokens} tokens (limit: ${tokenLimit}). Consider compacting completed milestones and removing stale context.`;
}
