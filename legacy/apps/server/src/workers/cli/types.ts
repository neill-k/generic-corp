export const CLI_TOOL_KINDS = ["generic", "claude", "gemini", "codex", "amp"] as const;

export type CliToolKind = (typeof CLI_TOOL_KINDS)[number];

export interface CliRunRequest {
  tool: CliToolKind;
  prompt: string;
  cwd?: string;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
}

export interface CliRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export interface CliToolAdapter {
  kind: CliToolKind;
  buildCommand(req: CliRunRequest): { command: string; args: string[]; env?: Record<string, string | undefined> };
  parseResult(result: CliRunResult): { output: string; toolsUsed?: string[]; tokensUsed?: { input: number; output: number } };
}
