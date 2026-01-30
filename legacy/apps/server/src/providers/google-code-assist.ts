import type { ProviderAccount } from "@prisma/client";
import type { ProviderAdapter, ProviderExecuteOptions, ProviderExecuteResult } from "./types.js";
import { encryptString } from "../services/encryption.js";
import { db } from "../db/index.js";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CODE_ASSIST_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CODE_ASSIST_CLIENT_SECRET || "";

export const googleCodeAssistAdapter: ProviderAdapter = {
  kind: "google_code_assist",

  async execute(
    _account: ProviderAccount,
    accessToken: string,
    options: ProviderExecuteOptions
  ): Promise<ProviderExecuteResult> {
    const contents = [];

    if (options.systemPrompt) {
      contents.push({
        role: "user",
        parts: [{ text: `System: ${options.systemPrompt}` }],
      });
      contents.push({
        role: "model",
        parts: [{ text: "Understood." }],
      });
    }

    contents.push({
      role: "user",
      parts: [{ text: options.prompt }],
    });

    const res = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: options.maxTokens || 4096,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Code Assist API error ${res.status}: ${errText}`);
    }

    const data = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
    };

    const output = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return {
      output,
      tokensUsed: data.usageMetadata ? {
        input: data.usageMetadata.promptTokenCount,
        output: data.usageMetadata.candidatesTokenCount,
        total: data.usageMetadata.totalTokenCount,
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

    const bodyParams: Record<string, string> = {
      grant_type: "refresh_token",
      client_id: GOOGLE_CLIENT_ID,
      refresh_token: refreshToken,
    };

    if (GOOGLE_CLIENT_SECRET) {
      bodyParams.client_secret = GOOGLE_CLIENT_SECRET;
    }

    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(bodyParams),
    });

    if (!res.ok) {
      console.error("[Google Code Assist] Token refresh failed:", res.status, await res.text());
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
