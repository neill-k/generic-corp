import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { db } from "../db/client.js";

interface CompletedChildTask {
  id: string;
  parentTaskId: string | null;
  assigneeId: string | null;
  result: string | null;
  status: string;
}

export async function handleChildCompletion(
  childTask: CompletedChildTask,
  workspaceRoot: string,
): Promise<void> {
  if (!childTask.parentTaskId) return;

  const parentTask = await db.task.findUnique({
    where: { id: childTask.parentTaskId },
    select: { id: true, assigneeId: true },
  });

  if (!parentTask) {
    console.error(`[Delegation] Parent task ${childTask.parentTaskId} not found`);
    return;
  }

  const parentAgent = await db.agent.findUnique({
    where: { id: parentTask.assigneeId ?? "" },
    select: { id: true, name: true },
  });

  if (!parentAgent) {
    console.error(`[Delegation] Parent agent ${parentTask.assigneeId} not found`);
    return;
  }

  // Write result to parent's .gc/results/ directory (shared workspace primitive)
  const resultsDir = path.join(workspaceRoot, parentAgent.name, ".gc", "results");
  await mkdir(resultsDir, { recursive: true });

  const now = new Date();
  const fileName = `${now.toISOString().replace(/[:.]/g, "-")}-${childTask.id}.md`;
  const body = `# Child Task Result

**Task ID**: ${childTask.id}
**Status**: ${childTask.status}
**Completed**: ${now.toISOString()}

---

${childTask.result?.trim() ?? "(no result provided)"}
`;

  await writeFile(path.join(resultsDir, fileName), body, "utf8");
}
