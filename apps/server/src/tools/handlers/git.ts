import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Maximum output size to prevent memory issues
const MAX_OUTPUT_SIZE = 1024 * 100; // 100KB

/**
 * Execute a git command safely using execFile with argument arrays
 * This prevents command injection by not using shell interpretation
 */
async function execGitCommand(
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync("git", args, {
      cwd,
      maxBuffer: MAX_OUTPUT_SIZE,
      timeout: 30000, // 30 second timeout
    });
    return { stdout, stderr };
  } catch (error) {
    const execError = error as { message: string; stderr?: string };
    throw new Error(
      `Git command failed: ${execError.message}${execError.stderr ? `\n${execError.stderr}` : ""}`
    );
  }
}

/**
 * Get git status
 */
export async function gitStatus(params: {
  repoPath: string;
}): Promise<{ status: string; branch: string; changes: string[] }> {
  // Get current branch
  const { stdout: branchOutput } = await execGitCommand(
    ["branch", "--show-current"],
    params.repoPath
  );
  const branch = branchOutput.trim();

  // Get status in porcelain format for easy parsing
  const { stdout: statusOutput } = await execGitCommand(
    ["status", "--porcelain"],
    params.repoPath
  );

  const changes = statusOutput
    .trim()
    .split("\n")
    .filter((line) => line.length > 0);

  const status =
    changes.length === 0 ? "Clean working directory" : `${changes.length} changes`;

  return { status, branch, changes };
}

/**
 * Create a git commit
 */
export async function gitCommit(params: {
  repoPath: string;
  message: string;
  files?: string[];
}): Promise<{ commitHash: string; filesCommitted: number }> {
  // Stage files
  if (params.files && params.files.length > 0) {
    // Stage specific files - use argument array to prevent injection
    for (const file of params.files) {
      await execGitCommand(["add", "--", file], params.repoPath);
    }
  } else {
    // Stage all changes
    await execGitCommand(["add", "-A"], params.repoPath);
  }

  // Check if there are changes to commit
  const { stdout: statusCheck } = await execGitCommand(
    ["status", "--porcelain"],
    params.repoPath
  );

  if (!statusCheck.trim()) {
    throw new Error("No changes to commit");
  }

  // Count staged files
  const { stdout: stagedFiles } = await execGitCommand(
    ["diff", "--cached", "--name-only"],
    params.repoPath
  );
  const filesCommitted = stagedFiles.trim().split("\n").filter(Boolean).length;

  // Create commit - message is passed as argument, not interpolated into shell command
  await execGitCommand(["commit", "-m", params.message], params.repoPath);

  // Get the commit hash
  const { stdout: hashOutput } = await execGitCommand(
    ["rev-parse", "HEAD"],
    params.repoPath
  );
  const commitHash = hashOutput.trim();

  return { commitHash, filesCommitted };
}

/**
 * Get git diff for staged changes
 */
export async function gitDiff(params: {
  repoPath: string;
  staged?: boolean;
}): Promise<{ diff: string }> {
  const args = params.staged ? ["diff", "--cached"] : ["diff"];
  const { stdout } = await execGitCommand(args, params.repoPath);
  return { diff: stdout };
}

/**
 * Get recent git log
 */
export async function gitLog(params: {
  repoPath: string;
  count?: number;
}): Promise<{ commits: Array<{ hash: string; message: string; date: string }> }> {
  const count = Math.min(Math.max(1, params.count || 10), 100); // Clamp between 1 and 100
  const { stdout } = await execGitCommand(
    ["log", "--oneline", `-${count}`, "--format=%H|%s|%ci"],
    params.repoPath
  );

  const commits = stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, message, date] = line.split("|");
      return { hash, message, date };
    });

  return { commits };
}
