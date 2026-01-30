import { randomBytes, createHash } from "node:crypto";
import type { Router } from "express";
import type { Prisma } from "@prisma/client";
import { db } from "../../db/index.js";
import { encryptString, decryptString, isEncryptionInitialized } from "../../services/encryption.js";

const OPENAI_AUTH_URL = "https://auth.openai.com/authorize";
const OPENAI_TOKEN_URL = "https://auth.openai.com/oauth/token";
const OPENAI_CLIENT_ID = process.env.OPENAI_CODEX_CLIENT_ID || "";
const OPENAI_REDIRECT_URI = process.env.OPENAI_CODEX_REDIRECT_URI || "";

const TRANSACTION_EXPIRY_MS = 10 * 60 * 1000;

function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

function generateState(): string {
  return randomBytes(16).toString("base64url");
}

export function setupOpenAICodexRoutes(router: Router): void {
  router.post("/openai_codex/connect/start", async (req, res) => {
    if (!isEncryptionInitialized()) {
      return res.status(503).json({ error: "Encryption not configured" });
    }

    if (!OPENAI_CLIENT_ID || !OPENAI_REDIRECT_URI) {
      return res.status(503).json({
        error: "OpenAI Codex OAuth not configured. Set OPENAI_CODEX_CLIENT_ID and OPENAI_CODEX_REDIRECT_URI",
      });
    }

    const ownerKey = (req.body.ownerKey as string) || "local";
    const state = generateState();
    const { verifier, challenge } = generatePKCE();

    await db.oAuthTransaction.create({
      data: {
        provider: "openai_codex",
        ownerKey,
        state,
        encryptedPkceVerifier: encryptString(verifier),
        flowData: {},
        expiresAt: new Date(Date.now() + TRANSACTION_EXPIRY_MS),
      },
    });

    const params = new URLSearchParams({
      client_id: OPENAI_CLIENT_ID,
      redirect_uri: OPENAI_REDIRECT_URI,
      response_type: "code",
      scope: "openid profile email offline_access",
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });

    const authUrl = `${OPENAI_AUTH_URL}?${params.toString()}`;
    res.json({ authUrl, state });
  });

  router.get("/openai_codex/connect/callback", async (req, res) => {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error("[OpenAI Codex] OAuth error:", error, error_description);
      return res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/providers?error=${encodeURIComponent(String(error))}`);
    }

    if (typeof code !== "string" || typeof state !== "string") {
      return res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/providers?error=missing_params`);
    }

    const transaction = await db.oAuthTransaction.findUnique({ where: { state } });

    if (!transaction || transaction.provider !== "openai_codex") {
      return res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/providers?error=invalid_state`);
    }

    if (transaction.expiresAt < new Date()) {
      await db.oAuthTransaction.delete({ where: { id: transaction.id } });
      return res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/providers?error=expired_state`);
    }

    const verifier = decryptString(transaction.encryptedPkceVerifier!);

    try {
      const tokenRes = await fetch(OPENAI_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: OPENAI_CLIENT_ID,
          redirect_uri: OPENAI_REDIRECT_URI,
          code,
          code_verifier: verifier,
        }),
      });

      if (!tokenRes.ok) {
        const errBody = await tokenRes.text();
        console.error("[OpenAI Codex] Token exchange failed:", tokenRes.status, errBody);
        await db.oAuthTransaction.delete({ where: { id: transaction.id } });
        return res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/providers?error=token_exchange_failed`);
      }

      const tokens = await tokenRes.json() as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type: string;
        scope?: string;
      };

      const accessTokenExpiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null;

      let accountMeta: Prisma.InputJsonValue = {};

      try {
        const userInfoRes = await fetch("https://auth.openai.com/userinfo", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        if (userInfoRes.ok) {
          const userInfo = await userInfoRes.json();
          accountMeta = { userInfo: userInfo as Prisma.InputJsonValue };
        }
      } catch (err) {
        console.warn("[OpenAI Codex] Failed to fetch userinfo:", err);
      }

      await db.providerAccount.create({
        data: {
          provider: "openai_codex",
          ownerKey: transaction.ownerKey,
          encryptedAccessToken: encryptString(tokens.access_token),
          accessTokenExpiresAt,
          encryptedRefreshToken: tokens.refresh_token ? encryptString(tokens.refresh_token) : null,
          scopes: tokens.scope ? tokens.scope.split(" ") : [],
          accountMeta,
          status: "active",
        },
      });

      await db.oAuthTransaction.delete({ where: { id: transaction.id } });

      res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/providers?success=openai_codex`);
    } catch (err) {
      console.error("[OpenAI Codex] Callback error:", err);
      await db.oAuthTransaction.delete({ where: { id: transaction.id } }).catch(() => {});
      return res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/providers?error=callback_error`);
    }
  });
}
