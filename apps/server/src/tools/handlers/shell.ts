import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Maximum output size
const MAX_OUTPUT_SIZE = 1024 * 100; // 100KB

// Allowed commands (whitelist approach for security)
const ALLOWED_COMMANDS = [
  "npm",
  "pnpm",
  "node",
  "git",
  "ls",
  "cat",
  "grep",
  "head",
  "tail",
  "wc",
  "find",
  "echo",
  "pwd",
  "mkdir",
  "touch",
  "rm",
  "cp",
  "mv",
];

// Blocked argument patterns (checked against individual arguments)
const BLOCKED_ARG_PATTERNS = [
  /\.\.\//,            // Directory traversal
  /^\/etc\//,          // System directories
  /^\/usr\//,
  /^\/var\//,
  /^\/root/,
];

// Blocked commands that should never be executed
const BLOCKED_COMMANDS = ["sudo", "chmod", "chown"];

/**
 * Parse a command string into command and arguments
 * Handles quoted strings properly
 */
function parseCommand(command: string): { cmd: string; args: string[] } {
  const tokens: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let i = 0; i < command.length; i++) {
    const char = command[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (char === " " && !inSingleQuote && !inDoubleQuote) {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  if (tokens.length === 0) {
    throw new Error("Empty command");
  }

  return { cmd: tokens[0], args: tokens.slice(1) };
}

/**
 * Validate command is safe to execute
 */
function validateCommand(cmd: string, args: string[]): void {
  // Check if command is blocked
  if (BLOCKED_COMMANDS.includes(cmd)) {
    throw new Error(`Command not allowed: ${cmd}`);
  }

  // Check if command is in allowlist
  if (!ALLOWED_COMMANDS.includes(cmd)) {
    throw new Error(
      `Command not allowed: ${cmd}. Allowed commands: ${ALLOWED_COMMANDS.join(", ")}`
    );
  }

  // Validate each argument against blocked patterns
  for (const arg of args) {
    for (const pattern of BLOCKED_ARG_PATTERNS) {
      if (pattern.test(arg)) {
        throw new Error(`Argument contains blocked pattern: ${arg}`);
      }
    }
  }

  // Special validation for rm command
  if (cmd === "rm") {
    const hasForceRecursive = args.some(
      (arg) => arg === "-rf" || arg === "-fr" || (arg.startsWith("-") && arg.includes("r") && arg.includes("f"))
    );
    const hasRootPath = args.some((arg) => arg === "/" || arg.startsWith("/*"));
    if (hasForceRecursive && hasRootPath) {
      throw new Error("Dangerous rm command blocked");
    }
  }
}

/**
 * Execute a shell command (restricted to safe commands)
 * Uses execFile with argument arrays to prevent command injection
 */
export async function shellExec(params: {
  command: string;
  cwd?: string;
}): Promise<{
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  // Parse command into executable and arguments
  const { cmd, args } = parseCommand(params.command);

  // Validate command and arguments
  validateCommand(cmd, args);

  // Default working directory to sandbox
  const cwd =
    params.cwd || process.env.AGENT_SANDBOX_ROOT || "/tmp/generic-corp-sandbox";

  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      cwd,
      maxBuffer: MAX_OUTPUT_SIZE,
      timeout: 30000, // 30 second timeout
      env: {
        ...process.env,
        // Restrict PATH for security
        PATH: "/usr/local/bin:/usr/bin:/bin",
      },
    });

    return {
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
    };
  } catch (error) {
    const execError = error as {
      message: string;
      stdout?: string;
      stderr?: string;
      code?: number;
    };

    return {
      success: false,
      stdout: execError.stdout?.trim() || "",
      stderr: execError.stderr?.trim() || execError.message,
      exitCode: execError.code || 1,
    };
  }
}

// Export for testing
export { ALLOWED_COMMANDS, BLOCKED_ARG_PATTERNS, BLOCKED_COMMANDS, validateCommand, parseCommand };
