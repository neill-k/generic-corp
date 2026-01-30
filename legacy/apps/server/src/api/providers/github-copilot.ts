import type { Router } from "express";
import type { Prisma } from "@prisma/client";
import { db } from "../../db/index.js";
import { encryptString, isEncryptionInitialized } from "../../services/encryption.js";

const GITHUB_DEVICE_CODE_URL = "https://github.com/login/device/code";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_CLIENT_ID = process.env.GITHUB_COPILOT_CLIENT_ID || "";

const TRANSACTION_EXPIRY_MS = 15 * 60 * 1000;

export function setupGitHubCopilotRoutes(router: Router): void {
  router.post("/github_copilot/connect/start", async (req, res) => {
    if (!isEncryptionInitialized()) {
      return res.status(503).json({ error: "Encryption not configured" });
    }

    if (!GITHUB_CLIENT_ID) {
      return res.status(503).json({
        error: "GitHub Copilot OAuth not configured. Set GITHUB_COPILOT_CLIENT_ID",
      });
    }

    const ownerKey = (req.body.ownerKey as string) || "local";

    try {
      const deviceRes = await fetch(GITHUB_DEVICE_CODE_URL, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: GITHUB_CLIENT_ID,
          scope: "read:user",
        }),
      });

      if (!deviceRes.ok) {
        const errBody = await deviceRes.text();
        console.error("[GitHub Copilot] Device code request failed:", deviceRes.status, errBody);
        return res.status(502).json({ error: "Failed to get device code from GitHub" });
      }

      const deviceData = await deviceRes.json() as {
        device_code: string;
        user_code: string;
        verification_uri: string;
        expires_in: number;
        interval: number;
      };

      const transaction = await db.oAuthTransaction.create({
        data: {
          provider: "github_copilot",
          ownerKey,
          state: deviceData.device_code,
          flowData: {
            user_code: deviceData.user_code,
            verification_uri: deviceData.verification_uri,
            interval: deviceData.interval,
          },
          expiresAt: new Date(Date.now() + Math.min(deviceData.expires_in * 1000, TRANSACTION_EXPIRY_MS)),
        },
      });

      res.json({
        pollId: transaction.id,
        userCode: deviceData.user_code,
        verificationUri: deviceData.verification_uri,
        expiresIn: deviceData.expires_in,
        interval: deviceData.interval,
      });
    } catch (err) {
      console.error("[GitHub Copilot] Start error:", err);
      res.status(500).json({ error: "Failed to start GitHub device flow" });
    }
  });

  router.post("/github_copilot/connect/poll", async (req, res) => {
    const { pollId } = req.body;

    if (typeof pollId !== "string") {
      return res.status(400).json({ error: "pollId required" });
    }

    const transaction = await db.oAuthTransaction.findUnique({ where: { id: pollId } });

    if (!transaction || transaction.provider !== "github_copilot") {
      return res.status(404).json({ error: "Poll session not found" });
    }

    if (transaction.expiresAt < new Date()) {
      await db.oAuthTransaction.delete({ where: { id: transaction.id } });
      return res.status(410).json({ error: "Session expired" });
    }

    const deviceCode = transaction.state;

    try {
      const tokenRes = await fetch(GITHUB_TOKEN_URL, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: GITHUB_CLIENT_ID,
          device_code: deviceCode,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        }),
      });

      const data = await tokenRes.json() as {
        access_token?: string;
        token_type?: string;
        scope?: string;
        error?: string;
        error_description?: string;
        interval?: number;
      };

      if (data.error === "authorization_pending") {
        return res.json({ status: "pending", interval: data.interval });
      }

      if (data.error === "slow_down") {
        return res.json({ status: "slow_down", interval: data.interval || 10 });
      }

      if (data.error) {
        console.error("[GitHub Copilot] Token poll error:", data.error, data.error_description);
        await db.oAuthTransaction.delete({ where: { id: transaction.id } });
        return res.status(400).json({ error: data.error, description: data.error_description });
      }

      if (!data.access_token) {
        return res.status(502).json({ error: "No access token in response" });
      }

      let accountMeta: Prisma.InputJsonValue = {};

      try {
        const userRes = await fetch("https://api.github.com/user", {
          headers: {
            "Authorization": `Bearer ${data.access_token}`,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        });
        if (userRes.ok) {
          const user = await userRes.json() as { login?: string; id?: number; name?: string };
          accountMeta = { login: user.login ?? null, id: user.id ?? null, name: user.name ?? null };
        }
      } catch (err) {
        console.warn("[GitHub Copilot] Failed to fetch user:", err);
      }

      await db.providerAccount.create({
        data: {
          provider: "github_copilot",
          ownerKey: transaction.ownerKey,
          encryptedAccessToken: encryptString(data.access_token),
          scopes: data.scope ? data.scope.split(",") : [],
          accountMeta,
          status: "active",
        },
      });

      await db.oAuthTransaction.delete({ where: { id: transaction.id } });

      res.json({ status: "success" });
    } catch (err) {
      console.error("[GitHub Copilot] Poll error:", err);
      res.status(500).json({ error: "Failed to poll GitHub" });
    }
  });
}
