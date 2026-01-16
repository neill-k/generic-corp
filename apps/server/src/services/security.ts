/**
 * Security utilities for input sanitization and validation
 */

/**
 * Sanitize user input before including in agent prompts.
 * Prevents prompt injection attacks.
 */
export function sanitizePromptInput(input: string): string {
  // Remove potential prompt injection markers
  let sanitized = input
    .replace(/\[SYSTEM\]/gi, "[USER_INPUT]")
    .replace(/\[INST\]/gi, "[USER_INPUT]")
    .replace(/<\|.*?\|>/g, "") // Remove special tokens
    .replace(/```system/gi, "```text"); // Neutralize system code blocks

  // Truncate extremely long inputs
  const MAX_INPUT_LENGTH = 10000;
  if (sanitized.length > MAX_INPUT_LENGTH) {
    sanitized = sanitized.slice(0, MAX_INPUT_LENGTH) + "\n[TRUNCATED]";
  }

  return sanitized;
}

/**
 * Validate that agent output doesn't contain unauthorized external actions.
 */
export function validateAgentOutput(
  output: string,
  agentId: string,
  allowedAgents: string[] = []
): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  // Check for unauthorized external communication attempts
  const externalPatterns = [
    /mailto:/i,
    /https?:\/\/(?!localhost|127\.0\.0\.1)/i,
    /curl\s+/i,
    /fetch\s*\(/i,
  ];

  // Agents that can draft external communications
  const canDraftExternal = ["frankie", "kenji", "helen", ...allowedAgents];

  if (!canDraftExternal.includes(agentId.toLowerCase())) {
    for (const pattern of externalPatterns) {
      if (pattern.test(output)) {
        violations.push(`Unauthorized external communication pattern: ${pattern}`);
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Validate file path is within allowed directories
 */
export function validatePath(path: string, allowedDirs: string[] = []): boolean {
  // Default allowed directories
  const defaultDirs = [
    process.cwd(),
    process.cwd() + "/apps",
    process.cwd() + "/packages",
  ];

  const allAllowed = [...defaultDirs, ...allowedDirs];

  // Check if path is within any allowed directory
  const normalizedPath = path.replace(/\\/g, "/");
  return allAllowed.some((dir) => {
    const normalizedDir = dir.replace(/\\/g, "/");
    return normalizedPath.startsWith(normalizedDir);
  });
}
