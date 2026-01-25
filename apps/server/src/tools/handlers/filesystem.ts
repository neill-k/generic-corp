import fs from "fs/promises";
import path from "path";

// Sandbox directory - agents can only access files within this directory
const SANDBOX_ROOT =
  process.env.AGENT_SANDBOX_ROOT || "/tmp/generic-corp-sandbox";

/**
 * Resolve a path safely within the sandbox
 * Uses fs.realpath to resolve symlinks and prevent symlink-based sandbox escapes
 * Throws if the resolved path is outside the sandbox
 */
async function resolveSafePath(filePath: string): Promise<string> {
  // Normalize and resolve the path
  const normalizedPath = path.normalize(filePath);

  // Compute the logical path (without resolving symlinks yet)
  let logicalPath: string;
  if (path.isAbsolute(normalizedPath)) {
    logicalPath = normalizedPath;
  } else {
    logicalPath = path.resolve(SANDBOX_ROOT, normalizedPath);
  }

  // First check: logical path must be within sandbox
  if (!logicalPath.startsWith(SANDBOX_ROOT + path.sep) && logicalPath !== SANDBOX_ROOT) {
    throw new Error("Access denied: Path outside sandbox");
  }

  // Second check: resolve symlinks and verify the real path is within sandbox
  // This prevents symlink-based sandbox escapes
  try {
    const realPath = await fs.realpath(logicalPath);
    const realSandboxRoot = await fs.realpath(SANDBOX_ROOT);

    if (!realPath.startsWith(realSandboxRoot + path.sep) && realPath !== realSandboxRoot) {
      throw new Error("Access denied: Symlink points outside sandbox");
    }

    return realPath;
  } catch (error) {
    // If the path doesn't exist yet (for write operations), verify the parent directory
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      const parentDir = path.dirname(logicalPath);
      try {
        const realParentDir = await fs.realpath(parentDir);
        const realSandboxRoot = await fs.realpath(SANDBOX_ROOT);

        if (!realParentDir.startsWith(realSandboxRoot + path.sep) && realParentDir !== realSandboxRoot) {
          throw new Error("Access denied: Parent directory symlink points outside sandbox");
        }

        // Return the logical path since the file doesn't exist yet
        return path.join(realParentDir, path.basename(logicalPath));
      } catch (parentError) {
        // Parent doesn't exist either - return logical path, mkdir will handle creation
        if ((parentError as NodeJS.ErrnoException).code === "ENOENT") {
          return logicalPath;
        }
        throw parentError;
      }
    }
    throw error;
  }
}

/**
 * Ensure sandbox directory exists
 */
async function ensureSandbox(): Promise<void> {
  try {
    await fs.mkdir(SANDBOX_ROOT, { recursive: true });
  } catch (error) {
    // Ignore if already exists
  }
}

/**
 * Read the contents of a file
 */
export async function filesystemRead(params: {
  path: string;
}): Promise<{ content: string }> {
  await ensureSandbox();
  const safePath = await resolveSafePath(params.path);

  try {
    const content = await fs.readFile(safePath, "utf-8");
    return { content };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`File not found: ${params.path}`);
    }
    throw error;
  }
}

/**
 * Write content to a file
 */
export async function filesystemWrite(params: {
  path: string;
  content: string;
}): Promise<{ success: boolean; path: string }> {
  await ensureSandbox();
  const safePath = await resolveSafePath(params.path);

  // Ensure parent directory exists
  await fs.mkdir(path.dirname(safePath), { recursive: true });

  await fs.writeFile(safePath, params.content, "utf-8");
  return { success: true, path: safePath };
}

/**
 * List files and directories at a path
 */
export async function filesystemList(params: {
  path: string;
}): Promise<{
  entries: Array<{ name: string; type: "file" | "directory" }>;
}> {
  await ensureSandbox();
  const safePath = await resolveSafePath(params.path);

  try {
    const entries = await fs.readdir(safePath, { withFileTypes: true });

    return {
      entries: entries.map((entry) => ({
        name: entry.name,
        type: entry.isDirectory() ? ("directory" as const) : ("file" as const),
      })),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Directory not found: ${params.path}`);
    }
    throw error;
  }
}

// Export sandbox root for testing
export { SANDBOX_ROOT };
