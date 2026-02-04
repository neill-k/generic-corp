import type { NextFunction, Request, Response } from "express";

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const message = err instanceof Error ? err.message : "Unknown error";
  console.error("[API] error", err);
  res.status(500).json({ error: message });
}
