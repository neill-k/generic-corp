import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Maximum output size to prevent memory issues
const MAX_OUTPUT_SIZE = 1024 * 100; // 100KB

/**
 * Execute a git command safely
 */
async function execGitCommand(
  command: string,
  cwd: string
): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execAsync(command, {
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
    "git branch --show-current",
    params.repoPath
  );
  const branch = branchOutput.trim();

  // Get status in porcelain format for easy parsing
  const { stdout: statusOutput } = await execGitCommand(
    "git status --porcelain",
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
    // Stage specific files
    for (const file of params.files) {
      await execGitCommand(`git add "${file}"`, params.repoPath);
    }
  } else {
    // Stage all changes
    await execGitCommand("git add -A", params.repoPath);
  }

  // Check if there are changes to commit
  const { stdout: statusCheck } = await execGitCommand(
    "git status --porcelain",
    params.repoPath
  );

  if (!statusCheck.trim()) {
    throw new Error("No changes to commit");
  }

  // Count staged files
  const { stdout: stagedFiles } = await execGitCommand(
    "git diff --cached --name-only",
    params.repoPath
  );
  const filesCommitted = stagedFiles.trim().split("\n").filter(Boolean).length;

  // Create commit with safe message handling
  const safeMessage = params.message.replace(/"/g, '\\"').replace(/\n/g, "\\n");
  await execGitCommand(`git commit -m "${safeMessage}"`, params.repoPath);

  // Get the commit hash
  const { stdout: hashOutput } = await execGitCommand(
    "git rev-parse HEAD",
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
  const command = params.staged ? "git diff --cached" : "git diff";
  const { stdout } = await execGitCommand(command, params.repoPath);
  return { diff: stdout };
}

/**
 * Get recent git log
 */
export async function gitLog(params: {
  repoPath: string;
  count?: number;
}): Promise<{ commits: Array<{ hash: string; message: string; date: string }> }> {
  const count = params.count || 10;
  const { stdout } = await execGitCommand(
    `git log --oneline -${count} --format="%H|%s|%ci"`,
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
