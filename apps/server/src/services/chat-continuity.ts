import { db } from "../db/client.js";
import type { AgentRuntime } from "./agent-lifecycle.js";

interface GenerateThreadSummaryParams {
  threadId: string;
  since: string;
  runtime: AgentRuntime;
}

export async function generateThreadSummary(
  params: GenerateThreadSummaryParams,
): Promise<string | null> {
  const messages = await db.message.findMany({
    where: {
      threadId: params.threadId,
      createdAt: { gt: new Date(params.since) },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      fromAgentId: true,
      createdAt: true,
    },
  });

  if (messages.length === 0) return null;

  const transcript = messages
    .map((m) => `[${m.fromAgentId ? "Agent" : "Human"}] ${m.body}`)
    .join("\n");

  const prompt = `Summarize the following conversation that happened while the user was away. Be concise (1-2 sentences).

${transcript}`;

  let output = "";
  for await (const event of params.runtime.invoke({
    agentId: "system-chat-summary",
    taskId: "thread-summary",
    prompt,
    systemPrompt: "You summarize conversations concisely. Output only the summary text.",
    cwd: "/tmp",
    mcpServer: null,
    model: "haiku",
  })) {
    if (event.type === "result") {
      output = event.result.output;
    }
  }

  return output;
}
