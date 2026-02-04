import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { PrismaClient } from "@prisma/client";

import type { AgentRuntime } from "./agent-lifecycle.js";
import type { BoardService } from "./board-service.js";

const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

let intervalId: ReturnType<typeof setInterval> | null = null;
let lastRunAt: Date | null = null;

export async function runSummarizerOnce(
  prisma: PrismaClient,
  runtime: AgentRuntime,
  boardService: BoardService,
  workspaceRoot: string,
): Promise<void> {
  const since = lastRunAt?.toISOString();
  lastRunAt = new Date();

  // Gather board items
  const boardItems = await boardService.listBoardItems({ since });

  // Gather completed tasks since last run
  const completedTasks = await prisma.task.findMany({
    where: {
      status: "completed",
      ...(since ? { completedAt: { gte: new Date(since) } } : {}),
    },
    select: {
      id: true,
      prompt: true,
      result: true,
      status: true,
      assignee: { select: { name: true, department: true } },
    },
    orderBy: { completedAt: "desc" },
    take: 50,
  });

  // Get departments for team digests
  const agents = await prisma.agent.findMany({
    select: { name: true, department: true },
  });
  const departments = [...new Set(agents.map((a) => a.department))];

  // Build context for the summarizer
  const boardSummary = boardItems.length > 0
    ? boardItems.map((item) => `- [${item.type}] ${item.author}: ${item.summary}`).join("\n")
    : "(no new board items)";

  const taskSummary = completedTasks.length > 0
    ? completedTasks.map((t) => `- ${t.assignee?.name ?? "unassigned"} (${t.assignee?.department ?? "N/A"}): ${t.prompt} → ${t.result ?? "done"}`).join("\n")
    : "(no completed tasks)";

  const prompt = `Summarize the following organizational activity into a concise digest.

## Board Items
${boardSummary}

## Completed Tasks
${taskSummary}

Write a markdown digest with sections: Key Accomplishments, Active Blockers, and Next Steps. Be concise.`;

  // Generate org-wide digest
  let orgDigest = "";
  for await (const event of runtime.invoke({
    agentId: "system-summarizer",
    taskId: "summarizer-run",
    prompt,
    systemPrompt: "You are a concise organizational summarizer. Output only markdown.",
    cwd: workspaceRoot,
    mcpServer: null,
    model: "haiku",
  })) {
    if (event.type === "result") {
      orgDigest = event.result.output;
    }
  }

  // Write org-wide digest
  const digestDir = path.join(workspaceRoot, "docs", "digests");
  await mkdir(digestDir, { recursive: true });
  await writeFile(path.join(digestDir, "org-wide.md"), orgDigest, "utf8");

  // Generate per-department digests
  for (const dept of departments) {
    const deptTasks = completedTasks.filter((t) => t.assignee?.department === dept);
    const deptBoard = boardItems.filter((item) => {
      const agent = agents.find((a) => a.name === item.author);
      return agent?.department === dept;
    });

    if (deptTasks.length === 0 && deptBoard.length === 0) continue;

    const deptPrompt = `Summarize ${dept} department activity:

## Board Items
${deptBoard.length > 0 ? deptBoard.map((i) => `- [${i.type}] ${i.author}: ${i.summary}`).join("\n") : "(none)"}

## Tasks
${deptTasks.length > 0 ? deptTasks.map((t) => `- ${t.assignee?.name ?? "unassigned"}: ${t.prompt} → ${t.result ?? "done"}`).join("\n") : "(none)"}

Write a short markdown team digest. Be concise.`;

    let deptDigest = "";
    for await (const event of runtime.invoke({
      agentId: "system-summarizer",
      taskId: `summarizer-${dept}`,
      prompt: deptPrompt,
      systemPrompt: "You are a concise team summarizer. Output only markdown.",
      cwd: workspaceRoot,
      mcpServer: null,
      model: "haiku",
    })) {
      if (event.type === "result") {
        deptDigest = event.result.output;
      }
    }

    const slug = dept.toLowerCase().replace(/\s+/g, "-");
    await writeFile(path.join(digestDir, `team-${slug}.md`), deptDigest, "utf8");
  }
}

export function startSummarizer(
  prisma: PrismaClient,
  runtime: AgentRuntime,
  boardService: BoardService,
  workspaceRoot: string,
): void {
  if (intervalId) return;
  intervalId = setInterval(() => {
    void runSummarizerOnce(prisma, runtime, boardService, workspaceRoot).catch((error) => {
      console.error("[Summarizer] run failed:", error);
    });
  }, INTERVAL_MS);
  console.log("[Summarizer] started (interval: 10min)");
}

export function stopSummarizer(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[Summarizer] stopped");
  }
}
