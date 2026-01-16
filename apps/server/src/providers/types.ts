import type { ProviderKind, ProviderAccount } from "@prisma/client";

export interface ProviderExecuteOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
}

export interface ProviderExecuteResult {
  output: string;
  tokensUsed?: {
    input?: number;
    output?: number;
    total?: number;
  };
  rawResponse?: unknown;
}

export interface ProviderAdapter {
  readonly kind: ProviderKind;
  execute(account: ProviderAccount, accessToken: string, options: ProviderExecuteOptions): Promise<ProviderExecuteResult>;
  refreshToken?(account: ProviderAccount): Promise<{ accessToken: string; expiresAt?: Date } | null>;
}
