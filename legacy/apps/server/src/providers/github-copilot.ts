import type { ProviderAccount } from "@prisma/client";
import type { ProviderAdapter, ProviderExecuteOptions, ProviderExecuteResult } from "./types.js";

const COPILOT_API_URL = "https://api.githubcopilot.com/chat/completions";

export const githubCopilotAdapter: ProviderAdapter = {
  kind: "github_copilot",

  async execute(
    _account: ProviderAccount,
    accessToken: string,
    options: ProviderExecuteOptions
  ): Promise<ProviderExecuteResult> {
    const messages = [];

    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }

    messages.push({ role: "user", content: options.prompt });

    const res = await fetch(COPILOT_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Editor-Version": "vscode/1.85.0",
        "Editor-Plugin-Version": "copilot-chat/0.12.0",
        "Openai-Organization": "github-copilot",
        "Copilot-Integration-Id": "vscode-chat",
      },
      body: JSON.stringify({
        messages,
        model: "gpt-4",
        max_tokens: options.maxTokens || 4096,
        stream: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GitHub Copilot API error ${res.status}: ${errText}`);
    }

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const output = data.choices?.[0]?.message?.content || "";

    return {
      output,
      tokensUsed: data.usage ? {
        input: data.usage.prompt_tokens,
        output: data.usage.completion_tokens,
        total: data.usage.total_tokens,
      } : undefined,
      rawResponse: data,
    };
  },
};
