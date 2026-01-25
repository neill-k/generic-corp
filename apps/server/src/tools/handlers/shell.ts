import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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

// Blocked patterns (even within allowed commands)
const BLOCKED_PATTERNS = [
  /[;&|`$]/,           // Command chaining/substitution
  /\.\.\//,            // Directory traversal
  /\/etc\//,           // System directories
  /\/usr\//,
  /\/var\//,
  /\/root/,
  /sudo/,
  /chmod/,
  /chown/,
  /rm\s+-rf?\s+\//,    // Dangerous rm commands
];

/**
 * Validate command is safe to execute
 */
function validateCommand(command: string): void {
  const trimmedCommand = command.trim();
  const firstWord = trimmedCommand.split(/\s+/)[0];

  // Check if command is allowed
  if (!ALLOWED_COMMANDS.includes(firstWord)) {
    throw new Error(
      `Command not allowed: ${firstWord}. Allowed commands: ${ALLOWED_COMMANDS.join(", ")}`
    );
  }

  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmedCommand)) {
      throw new Error(`Command contains blocked pattern: ${trimmedCommand}`);
    }
  }
}

/**
 * Execute a shell command (restricted to safe commands)
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
  // Validate command
  validateCommand(params.command);

  // Default working directory to sandbox
  const cwd =
    params.cwd || process.env.AGENT_SANDBOX_ROOT || "/tmp/generic-corp-sandbox";

  try {
    const { stdout, stderr } = await execAsync(params.command, {
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
export { ALLOWED_COMMANDS, BLOCKED_PATTERNS, validateCommand };
