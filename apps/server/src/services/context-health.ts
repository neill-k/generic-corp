import { readFile } from "node:fs/promises";
import path from "node:path";

const CHARS_PER_TOKEN = 4;

function getTokenLimit(): number {
  const envVal = process.env["GC_CONTEXT_TOKEN_LIMIT"];
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 6000;
}

export async function checkContextHealth(
  workspacePath: string,
): Promise<string | null> {
  const contextPath = path.join(workspacePath, ".gc", "context.md");

  let content: string;
  try {
    content = await readFile(contextPath, "utf8");
  } catch {
    return null;
  }

  const estimatedTokens = Math.round(content.length / CHARS_PER_TOKEN);
  const tokenLimit = getTokenLimit();

  return `Your context.md is ~${estimatedTokens} tokens (advisory limit: ${tokenLimit}). ${estimatedTokens > tokenLimit ? "Consider compacting completed milestones and removing stale context to stay efficient." : "Size is within recommended range."}`;
}
