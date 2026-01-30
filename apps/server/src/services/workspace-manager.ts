import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SEED_CONTEXT = `# Working Context

## Current Objective
(awaiting first task)

## Priorities
(none yet)

## Known Context
(none yet)

## Completed Milestones
(none yet)

## Blockers
(none identified)
`;

const SHARED_DIRS = [
  "board/status-updates",
  "board/blockers",
  "board/findings",
  "board/requests",
  "board/completed",
  "docs/learnings",
  "docs/digests",
];

export class WorkspaceManager {
  private readonly root: string;

  constructor(workspaceRoot: string) {
    this.root = path.resolve(workspaceRoot);
  }

  getWorkspaceRoot(): string {
    return this.root;
  }

  getAgentWorkspacePath(agentName: string): string {
    return path.join(this.root, "agents", agentName);
  }

  async ensureInitialized(): Promise<void> {
    for (const dir of SHARED_DIRS) {
      await mkdir(path.join(this.root, dir), { recursive: true });
    }
  }

  async ensureAgentWorkspace(agentName: string): Promise<string> {
    const agentDir = this.getAgentWorkspacePath(agentName);
    const gcDir = path.join(agentDir, ".gc");
    const resultsDir = path.join(gcDir, "results");

    await mkdir(resultsDir, { recursive: true });

    const contextPath = path.join(gcDir, "context.md");
    try {
      await readFile(contextPath, "utf8");
    } catch {
      await writeFile(contextPath, SEED_CONTEXT, "utf8");
    }

    return agentDir;
  }
}
