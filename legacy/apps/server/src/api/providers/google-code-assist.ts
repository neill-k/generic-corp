import { randomBytes, createHash } from "node:crypto";
import type { Router } from "express";
import type { Prisma } from "@prisma/client";
import { db } from "../../db/index.js";
import { encryptString, decryptString, isEncryptionInitialized } from "../../services/encryption.js";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CODE_ASSIST_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CODE_ASSIST_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_CODE_ASSIST_REDIRECT_URI || "";

const TRANSACTION_EXPIRY_MS = 10 * 60 * 1000;

function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

function generateState(): string {
  return randomBytes(16).toString("base64url");
}

export function setupGoogleCodeAssistRoutes(router: Router): void {
  router.post("/google_code_assist/connect/start", async (req, res) => {
    if (!isEncryptionInitialized()) {
      return res.status(503).json({ error: "Encryption not configured" });
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
      return res.status(503).json({
        error: "Google Code Assist OAuth not configured. Set GOOGLE_CODE_ASSIST_CLIENT_ID and GOOGLE_CODE_ASSIST_REDIRECT_URI",
      });
    }

    const ownerKey = (req.body.ownerKey as string) || "local";
    const state = generateState();
    const { verifier, challenge } = generatePKCE();

    await db.oAuthTransaction.create({
      data: {
        provider: "google_code_assist",
        ownerKey,
        state,
        encryptedPkceVerifier: encryptString(verifier),
        flowData: {},
        expiresAt: new Date(Date.now() + TRANSACTION_EXPIRY_MS),
      },
    });

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: "code",
      scope: "openid profile email https://www.googleapis.com/auth/cloud-platform",
      access_type: "offline",
      prompt: "consent",
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });

    const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;
    res.json({ authUrl, state });
  });

  router.get("/google_code_assist/connect/callback", async (req, res) => {
    const { code, state, error, error_description } = req.query;
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

    if (error) {
      console.error("[Google Code Assist] OAuth error:", error, error_description);
      return res.redirect(`${clientUrl}/providers?error=${encodeURIComponent(String(error))}`);
    }

    if (typeof code !== "string" || typeof state !== "string") {
      return res.redirect(`${clientUrl}/providers?error=missing_params`);
    }

    const transaction = await db.oAuthTransaction.findUnique({ where: { state } });

    if (!transaction || transaction.provider !== "google_code_assist") {
      return res.redirect(`${clientUrl}/providers?error=invalid_state`);
    }

    if (transaction.expiresAt < new Date()) {
      await db.oAuthTransaction.delete({ where: { id: transaction.id } });
      return res.redirect(`${clientUrl}/providers?error=expired_state`);
    }

    const verifier = decryptString(transaction.encryptedPkceVerifier!);

    try {
      const bodyParams: Record<string, string> = {
        grant_type: "authorization_code",
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_URI,
        code,
        code_verifier: verifier,
      };

      if (GOOGLE_CLIENT_SECRET) {
        bodyParams.client_secret = GOOGLE_CLIENT_SECRET;
      }

      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(bodyParams),
      });

      if (!tokenRes.ok) {
        const errBody = await tokenRes.text();
        console.error("[Google Code Assist] Token exchange failed:", tokenRes.status, errBody);
        await db.oAuthTransaction.delete({ where: { id: transaction.id } });
        return res.redirect(`${clientUrl}/providers?error=token_exchange_failed`);
      }

      const tokens = await tokenRes.json() as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type: string;
        scope?: string;
        id_token?: string;
      };

      const accessTokenExpiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null;

      let accountMeta: Prisma.InputJsonValue = {};

      try {
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        if (userInfoRes.ok) {
          const userInfo = await userInfoRes.json() as { email?: string; name?: string; id?: string };
          accountMeta = { email: userInfo.email ?? null, name: userInfo.name ?? null, id: userInfo.id ?? null };
        }
      } catch (err) {
        console.warn("[Google Code Assist] Failed to fetch userinfo:", err);
      }

      await db.providerAccount.create({
        data: {
          provider: "google_code_assist",
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

      res.redirect(`${clientUrl}/providers?success=google_code_assist`);
    } catch (err) {
      console.error("[Google Code Assist] Callback error:", err);
      await db.oAuthTransaction.delete({ where: { id: transaction.id } }).catch(() => {});
      return res.redirect(`${clientUrl}/providers?error=callback_error`);
    }
  });
}
