/**
 * Production Hardening Middleware
 *
 * Implements security, logging, rate limiting, and error handling for production deployment
 * Author: Yuki Tanaka (SRE)
 * Date: 2026-01-26
 */

import type { Request, Response, NextFunction, Express } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";

// ==================== REQUEST LOGGING ====================

interface RequestLog {
  timestamp: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  responseTime?: number;
  statusCode?: number;
  error?: string;
}

/**
 * Request logging middleware
 * Logs all incoming requests with timing information
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  const log: RequestLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress || "unknown",
    userAgent: req.get("user-agent") || "unknown",
  };

  // Capture response details
  res.on("finish", () => {
    log.responseTime = Date.now() - startTime;
    log.statusCode = res.statusCode;

    // Log based on status code
    if (res.statusCode >= 500) {
      console.error("[REQUEST ERROR]", JSON.stringify(log));
    } else if (res.statusCode >= 400) {
      console.warn("[REQUEST WARN]", JSON.stringify(log));
    } else if (process.env["NODE_ENV"] !== "production" || res.statusCode >= 300) {
      console.log("[REQUEST]", JSON.stringify(log));
    }
  });

  next();
}

// ==================== RATE LIMITING ====================

// Rate limiter configurations by endpoint type
const rateLimiters = {
  // Strict rate limiting for auth/sensitive endpoints
  strict: new RateLimiterMemory({
    points: 10, // 10 requests
    duration: 60, // per 60 seconds
    blockDuration: 300, // block for 5 minutes if exceeded
  }),

  // Moderate rate limiting for API endpoints
  api: new RateLimiterMemory({
    points: 100, // 100 requests
    duration: 60, // per 60 seconds
    blockDuration: 60, // block for 1 minute if exceeded
  }),

  // Lenient rate limiting for read-only endpoints
  readonly: new RateLimiterMemory({
    points: 300, // 300 requests
    duration: 60, // per 60 seconds
  }),
};

/**
 * Rate limiting middleware factory
 * @param type - Type of rate limit to apply
 */
export function rateLimiter(type: keyof typeof rateLimiters = "api") {
  const limiter = rateLimiters[type];

  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";

    try {
      await limiter.consume(ip);
      next();
    } catch (error) {
      const retryAfter = error && typeof error === "object" && "msBeforeNext" in error
        ? Math.ceil((error.msBeforeNext as number) / 1000)
        : 60;

      res.set("Retry-After", String(retryAfter));
      res.status(429).json({
        error: "Too many requests",
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      });
    }
  };
}

// ==================== INPUT VALIDATION ====================

/**
 * Sanitize string input to prevent injection attacks
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== "string") {
    return "";
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, "");

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length to prevent DoS
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }

  return sanitized;
}

/**
 * Validate email format
 */
export function isValidEmail(email: unknown): boolean {
  if (typeof email !== "string") {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 320; // RFC 5321
}

/**
 * Validate UUID format
 */
export function isValidUUID(id: unknown): boolean {
  if (typeof id !== "string") {
    return false;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validate pagination parameters
 */
export function validatePagination(params: {
  page?: unknown;
  limit?: unknown;
}): { page: number; limit: number } {
  let page = 1;
  let limit = 50;

  if (typeof params.page === "string" || typeof params.page === "number") {
    const parsedPage = Number(params.page);
    if (!isNaN(parsedPage) && parsedPage > 0 && parsedPage <= 1000) {
      page = Math.floor(parsedPage);
    }
  }

  if (typeof params.limit === "string" || typeof params.limit === "number") {
    const parsedLimit = Number(params.limit);
    if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) {
      limit = Math.floor(parsedLimit);
    }
  }

  return { page, limit };
}

// ==================== ERROR HANDLING ====================

interface ErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
  requestId?: string;
}

/**
 * Global error handler middleware
 * Catches all unhandled errors and returns consistent error responses
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Log the error
  console.error("[ERROR]", {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
  });

  // Determine status code
  let statusCode = 500;
  if ("statusCode" in err && typeof err.statusCode === "number") {
    statusCode = err.statusCode;
  }

  // Build error response
  const response: ErrorResponse = {
    error: err.name || "InternalServerError",
    message: statusCode === 500
      ? "An internal server error occurred"
      : err.message,
  };

  // Include stack trace in development
  if (process.env["NODE_ENV"] !== "production") {
    response.details = {
      stack: err.stack,
      ...("details" in err ? { details: err.details } : {}),
    };
  }

  res.status(statusCode).json(response);
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: "NotFound",
    message: `Route ${req.method} ${req.path} not found`,
  });
}

// ==================== HEALTH CHECKS ====================

/**
 * Liveness probe - checks if the server process is alive
 * This should be a simple check that returns quickly
 */
export async function livenessCheck(_req: Request, res: Response) {
  res.status(200).json({
    status: "ok",
    timestamp: Date.now(),
    uptime: process.uptime(),
  });
}

/**
 * Readiness probe - checks if the server can handle requests
 * This should verify database, Redis, and other critical dependencies
 */
export async function readinessCheck(_req: Request, res: Response) {
  const checks: Record<string, { status: "ok" | "error"; latency?: number; error?: string }> = {};
  let allHealthy = true;

  // Check database connection
  try {
    const startDb = Date.now();
    const { db } = await import("../db/client.js");
    await db.$queryRaw`SELECT 1`;
    checks["database"] = { status: "ok", latency: Date.now() - startDb };
  } catch (error) {
    checks["database"] = {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
    allHealthy = false;
  }

  // Check Redis connection (if available)
  try {
    const startRedis = Date.now();
    const { getRedisPubClient } = await import("../services/redis-client.js");
    const redis = getRedisPubClient();
    await redis.ping();
    checks["redis"] = { status: "ok", latency: Date.now() - startRedis };
  } catch (error) {
    checks["redis"] = {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
    // Redis failure is not critical for readiness
    // allHealthy = false;
  }

  const statusCode = allHealthy ? 200 : 503;
  res.status(statusCode).json({
    status: allHealthy ? "ready" : "not ready",
    timestamp: Date.now(),
    checks,
  });
}

// ==================== SECURITY HEADERS ====================

/**
 * Security headers middleware
 * Note: Helmet is already applied in the main app, but this adds additional headers
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent information leakage
  res.removeHeader("X-Powered-By");

  // Add custom security headers
  res.setHeader("X-Request-ID", req.headers["x-request-id"] || `req-${Date.now()}`);

  next();
}

// ==================== SETUP FUNCTION ====================

/**
 * Apply all production hardening middleware to the Express app
 */
export function applyProductionHardening(app: Express) {
  // Security headers (before other middleware)
  app.use(securityHeaders);

  // Request logging
  app.use(requestLogger);

  // Health check endpoints (no rate limiting)
  app.get("/health", livenessCheck);
  app.get("/ready", readinessCheck);
  app.get("/healthz", livenessCheck); // Kubernetes-style alias
  app.get("/readyz", readinessCheck); // Kubernetes-style alias

  // Apply rate limiting to API routes
  app.use("/api/*", rateLimiter("api"));

  console.log("[Production] Hardening middleware applied");
}

/**
 * Apply error handlers (should be last in middleware chain)
 */
export function applyErrorHandlers(app: Express) {
  // 404 handler for undefined routes
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  console.log("[Production] Error handlers applied");
}
