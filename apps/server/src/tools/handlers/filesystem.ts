import fs from "fs/promises";
import path from "path";

// Sandbox directory - agents can only access files within this directory
const SANDBOX_ROOT =
  process.env.AGENT_SANDBOX_ROOT || "/tmp/generic-corp-sandbox";

/**
 * Resolve a path safely within the sandbox
 * Throws if the resolved path is outside the sandbox
 */
function resolveSafePath(filePath: string): string {
  // Normalize and resolve the path
  const normalizedPath = path.normalize(filePath);

  // If it's an absolute path, it must be within sandbox
  if (path.isAbsolute(normalizedPath)) {
    if (!normalizedPath.startsWith(SANDBOX_ROOT)) {
      throw new Error("Access denied: Path outside sandbox");
    }
    return normalizedPath;
  }

  // Resolve relative path within sandbox
  const resolved = path.resolve(SANDBOX_ROOT, normalizedPath);

  // Verify it's still within sandbox (prevents ../ attacks)
  if (!resolved.startsWith(SANDBOX_ROOT)) {
    throw new Error("Access denied: Path outside sandbox");
  }

  return resolved;
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
  const safePath = resolveSafePath(params.path);

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
  const safePath = resolveSafePath(params.path);

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
  const safePath = resolveSafePath(params.path);

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
