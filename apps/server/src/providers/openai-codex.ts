import type { ProviderAccount } from "@prisma/client";
import type { ProviderAdapter, ProviderExecuteOptions, ProviderExecuteResult } from "./types.js";
import { encryptString } from "../services/encryption.js";
import { db } from "../db/index.js";

const OPENAI_TOKEN_URL = "https://auth.openai.com/oauth/token";
const CHATGPT_API_URL = "https://chatgpt.com/backend-api/codex/completions";
const OPENAI_CLIENT_ID = process.env.OPENAI_CODEX_CLIENT_ID || "";

export const openaiCodexAdapter: ProviderAdapter = {
  kind: "openai_codex",

  async execute(
    account: ProviderAccount,
    accessToken: string,
    options: ProviderExecuteOptions
  ): Promise<ProviderExecuteResult> {
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    const meta = account.accountMeta as Record<string, unknown> | null;
    if (meta?.userInfo && typeof meta.userInfo === "object") {
      const userInfo = meta.userInfo as Record<string, unknown>;
      if (userInfo.sub) {
        headers["ChatGPT-Account-Id"] = String(userInfo.sub);
      }
    }

    const body = {
      prompt: options.prompt,
      max_tokens: options.maxTokens || 4096,
      model: "gpt-4",
    };

    const res = await fetch(CHATGPT_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI Codex API error ${res.status}: ${errText}`);
    }

    const data = await res.json() as {
      choices?: Array<{ text?: string; message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const output = data.choices?.[0]?.text || data.choices?.[0]?.message?.content || "";

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

  async refreshToken(account: ProviderAccount): Promise<{ accessToken: string; expiresAt?: Date } | null> {
    if (!account.encryptedRefreshToken) {
      return null;
    }

    const { decryptString } = await import("../services/encryption.js");
    const refreshToken = decryptString(account.encryptedRefreshToken);

    const res = await fetch(OPENAI_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: OPENAI_CLIENT_ID,
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      console.error("[OpenAI Codex] Token refresh failed:", res.status, await res.text());
      await db.providerAccount.update({
        where: { id: account.id },
        data: {
          status: "error",
          lastError: `Token refresh failed: ${res.status}`,
          lastErrorAt: new Date(),
        },
      });
      return null;
    }

    const tokens = await res.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    const expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined;

    await db.providerAccount.update({
      where: { id: account.id },
      data: {
        encryptedAccessToken: encryptString(tokens.access_token),
        accessTokenExpiresAt: expiresAt ?? null,
        encryptedRefreshToken: tokens.refresh_token ? encryptString(tokens.refresh_token) : account.encryptedRefreshToken,
        lastError: null,
        lastErrorAt: null,
      },
    });

    return { accessToken: tokens.access_token, expiresAt };
  },
};
