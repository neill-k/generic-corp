/**
 * Security utilities for input sanitization and validation
 */

// Patterns that indicate potential prompt injection attempts
const PROMPT_INJECTION_PATTERNS = [
  // System/instruction markers
  /\[SYSTEM\]/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<<SYS>>/gi,
  /<\/SYS>>/gi,
  /\[ASSISTANT\]/gi,
  /\[USER\]/gi,

  // Special tokens common in LLMs
  /<\|.*?\|>/g,
  /<\|endoftext\|>/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,

  // Role/persona manipulation
  /ignore\s+(previous|all|above)\s+(instructions?|prompts?)/gi,
  /disregard\s+(previous|all|above)\s+(instructions?|prompts?)/gi,
  /forget\s+(previous|all|above)\s+(instructions?|prompts?)/gi,
  /you\s+are\s+now\s+(a|an)\s+/gi,
  /pretend\s+(you|to\s+be)/gi,
  /act\s+as\s+(if|a|an)/gi,
  /roleplay\s+as/gi,
  /your\s+new\s+(role|instructions?|persona)/gi,

  // System prompt extraction attempts
  /what\s+(is|are)\s+your\s+(system\s+)?prompt/gi,
  /reveal\s+(your\s+)?(system\s+)?instructions?/gi,
  /show\s+(me\s+)?(your\s+)?(system\s+)?prompt/gi,
  /output\s+(your\s+)?(initial|system)\s+(prompt|instructions?)/gi,

  // Jailbreak patterns
  /developer\s+mode/gi,
  /DAN\s+(mode)?/gi,
  /jailbreak/gi,
  /bypass\s+(safety|restrictions?|filters?)/gi,

  // Code block injection
  /```system/gi,
  /```instruction/gi,
];

/**
 * Sanitize user input before including in agent prompts.
 * Prevents prompt injection attacks.
 */
export function sanitizePromptInput(input: string): string {
  let sanitized = input;

  // Remove or neutralize all injection patterns
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[FILTERED]");
  }

  // Additional normalization
  sanitized = sanitized
    .replace(/```system/gi, "```text") // Neutralize system code blocks
    .replace(/```instruction/gi, "```text"); // Neutralize instruction code blocks

  // Truncate extremely long inputs
  const MAX_INPUT_LENGTH = 10000;
  if (sanitized.length > MAX_INPUT_LENGTH) {
    sanitized = sanitized.slice(0, MAX_INPUT_LENGTH) + "\n[TRUNCATED]";
  }

  return sanitized;
}

/**
 * Check if input contains potential prompt injection attempts
 * Returns true if injection is detected
 */
export function detectPromptInjection(input: string): {
  detected: boolean;
  patterns: string[];
} {
  const detectedPatterns: string[] = [];

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      detectedPatterns.push(pattern.source);
      // Reset regex lastIndex for global patterns
      pattern.lastIndex = 0;
    }
  }

  return {
    detected: detectedPatterns.length > 0,
    patterns: detectedPatterns,
  };
}

// Export patterns for testing
export { PROMPT_INJECTION_PATTERNS };

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
