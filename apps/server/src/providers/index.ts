import type { ProviderKind } from "@prisma/client";
import type { ProviderAdapter, ProviderExecuteOptions, ProviderExecuteResult } from "./types.js";
import { db } from "../db/index.js";
import { decryptString, isEncryptionInitialized } from "../services/encryption.js";

import { openaiCodexAdapter } from "./openai-codex.js";
import { githubCopilotAdapter } from "./github-copilot.js";
import { googleCodeAssistAdapter } from "./google-code-assist.js";

export type { ProviderAdapter, ProviderExecuteOptions, ProviderExecuteResult } from "./types.js";

const adapters: Record<string, ProviderAdapter> = {
  openai_codex: openaiCodexAdapter,
  github_copilot: githubCopilotAdapter,
  google_code_assist: googleCodeAssistAdapter,
};

export function getAdapter(kind: ProviderKind): ProviderAdapter | undefined {
  return adapters[kind];
}

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export async function executeWithProvider(
  accountId: string,
  options: ProviderExecuteOptions
): Promise<ProviderExecuteResult> {
  if (!isEncryptionInitialized()) {
    throw new Error("Encryption not initialized");
  }

  const account = await db.providerAccount.findUnique({ where: { id: accountId } });

  if (!account) {
    throw new Error(`Provider account not found: ${accountId}`);
  }

  if (account.status !== "active") {
    throw new Error(`Provider account is not active: ${account.status}`);
  }

  const adapter = getAdapter(account.provider);

  if (!adapter) {
    throw new Error(`No adapter for provider: ${account.provider}`);
  }

  let accessToken = decryptString(account.encryptedAccessToken);

  const needsRefresh = account.accessTokenExpiresAt &&
    account.accessTokenExpiresAt.getTime() < Date.now() + TOKEN_REFRESH_BUFFER_MS;

  if (needsRefresh && adapter.refreshToken) {
    const refreshed = await adapter.refreshToken(account);
    if (refreshed) {
      accessToken = refreshed.accessToken;
    } else {
      throw new Error("Token refresh failed and token is expired");
    }
  }

  await db.providerAccount.update({
    where: { id: account.id },
    data: { lastUsedAt: new Date() },
  });

  try {
    const result = await adapter.execute(account, accessToken, options);
    return result;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await db.providerAccount.update({
      where: { id: account.id },
      data: {
        lastError: errMsg,
        lastErrorAt: new Date(),
      },
    });
    throw err;
  }
}
