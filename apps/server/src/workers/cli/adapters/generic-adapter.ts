import type { CliRunRequest, CliRunResult, CliToolAdapter } from "../types.js";

export class GenericCliAdapter implements CliToolAdapter {
  kind = "generic" as const;

  buildCommand(req: CliRunRequest) {
    const command = process.env.GENERIC_CORP_AGENT_CLI_COMMAND ?? "bash";
    const argsEnv = process.env.GENERIC_CORP_AGENT_CLI_ARGS;
    const baseArgs = argsEnv ? argsEnv.split(" ").filter(Boolean) : ["-lc"];

    // Default behavior: run a shell command that prints the prompt to stdout.
    // You can override the command/args/script to call a real CLI tool.
    // We pass prompt via env to avoid shell injection.
    const script = process.env.GENERIC_CORP_AGENT_CLI_SCRIPT ?? `printf '%s' "$AGENT_PROMPT"`;
    return {
      command,
      args: [...baseArgs, script],
      env: {
        AGENT_PROMPT: req.prompt,
      },
    };
  }

  parseResult(result: CliRunResult) {
    return {
      output: result.stdout.trim() || result.stderr.trim(),
      toolsUsed: ["cli"],
    };
  }
}
