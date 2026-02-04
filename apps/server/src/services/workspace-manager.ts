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

/** Directories created inside each org workspace. */
const ORG_DIRS = ["agents", "board", "docs"];

export class WorkspaceManager {
  private readonly root: string;

  constructor(workspaceRoot: string) {
    this.root = path.resolve(workspaceRoot);
  }

  getWorkspaceRoot(): string {
    return this.root;
  }

  /**
   * Return the root path for an org-scoped workspace.
   * E.g. `<root>/orgs/<slug>/`
   */
  getOrgWorkspacePath(orgSlug: string): string {
    return path.join(this.root, "orgs", orgSlug);
  }

  /**
   * Return the agent workspace path, optionally scoped to an org.
   * With orgSlug: `<root>/orgs/<slug>/agents/<agentName>`
   * Without:      `<root>/agents/<agentName>`
   */
  getAgentWorkspacePath(agentName: string, orgSlug?: string): string {
    if (orgSlug) {
      return path.join(this.getOrgWorkspacePath(orgSlug), "agents", agentName);
    }
    return path.join(this.root, "agents", agentName);
  }

  async ensureInitialized(): Promise<void> {
    for (const dir of SHARED_DIRS) {
      await mkdir(path.join(this.root, dir), { recursive: true });
    }
  }

  /**
   * Create the org workspace directory tree:
   *   workspace/orgs/<slug>/agents/
   *   workspace/orgs/<slug>/board/
   *   workspace/orgs/<slug>/docs/
   */
  async ensureOrgWorkspace(orgSlug: string): Promise<string> {
    const orgRoot = this.getOrgWorkspacePath(orgSlug);

    for (const dir of ORG_DIRS) {
      await mkdir(path.join(orgRoot, dir), { recursive: true });
    }

    return orgRoot;
  }

  /**
   * Ensure the agent workspace exists and seed context.md if missing.
   * When orgSlug is provided, the path is org-scoped.
   */
  async ensureAgentWorkspace(agentName: string, orgSlug?: string): Promise<string> {
    const agentDir = this.getAgentWorkspacePath(agentName, orgSlug);
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
