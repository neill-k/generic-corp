/**
 * Tenant Context Middleware
 *
 * Validates tenant identity and attaches tenant-scoped Prisma client to requests.
 * Architecture approved by Sable Chen, Principal Engineer.
 *
 * Security:
 * - Validates tenant exists and is active before granting access
 * - Prevents cross-tenant data leakage
 * - Enforces tenant context for all API requests
 *
 * Tenant Identification Strategy:
 * 1. Subdomain (e.g., acme.app.generic-corp.com)
 * 2. X-Tenant-Slug header
 * 3. JWT claim (if using auth)
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPrismaForTenant, getPublicPrisma } from '../lib/prisma-tenant';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
        slug: string;
        schemaName: string;
        planTier: string;
        status: string;
      };
      prisma?: PrismaClient;
    }
  }
}

/**
 * Extract tenant identifier from request
 * Supports: subdomain, header, or JWT claim
 */
function extractTenantSlug(req: Request): string | null {
  // Strategy 1: Subdomain (e.g., acme.app.generic-corp.com)
  const hostname = req.hostname || req.headers.host?.split(':')[0] || '';
  const subdomain = hostname.split('.')[0];

  // Valid subdomain (not app, www, api, demo, or localhost)
  if (subdomain && !['app', 'www', 'api', 'demo', 'localhost'].includes(subdomain)) {
    return subdomain;
  }

  // Strategy 2: X-Tenant-Slug header
  const header = req.headers['x-tenant-slug'];
  if (header && typeof header === 'string') {
    return header;
  }

  // Strategy 3: JWT claim (if using auth)
  // @ts-ignore - user might be set by auth middleware
  if (req.user?.tenantSlug) {
    // @ts-ignore
    return req.user.tenantSlug;
  }

  return null;
}

/**
 * Tenant context middleware
 * Validates tenant and attaches tenant-scoped Prisma client to request
 */
export async function tenantContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantSlug = extractTenantSlug(req);

    if (!tenantSlug) {
      res.status(400).json({
        error: 'Tenant identifier required',
        message: 'Please provide tenant via subdomain or X-Tenant-Slug header',
        code: 'TENANT_REQUIRED'
      });
      return;
    }

    // Validate and get tenant metadata
    const publicPrisma = getPublicPrisma();
    const tenant = await publicPrisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: {
        id: true,
        slug: true,
        schemaName: true,
        status: true,
        planTier: true
      }
    });

    if (!tenant) {
      res.status(404).json({
        error: 'Tenant not found',
        tenantSlug,
        code: 'TENANT_NOT_FOUND'
      });
      return;
    }

    if (tenant.status !== 'active') {
      res.status(403).json({
        error: 'Tenant not active',
        tenantSlug,
        status: tenant.status,
        code: 'TENANT_INACTIVE'
      });
      return;
    }

    // Attach tenant context to request
    req.tenant = {
      id: tenant.id,
      slug: tenant.slug,
      schemaName: tenant.schemaName,
      planTier: tenant.planTier,
      status: tenant.status
    };

    // Attach tenant-scoped Prisma client
    req.prisma = await getPrismaForTenant(tenantSlug);

    // Audit log for security monitoring
    console.log({
      timestamp: new Date().toISOString(),
      event: 'tenant_context_attached',
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      schemaName: tenant.schemaName,
      endpoint: req.path,
      method: req.method,
      ip: req.ip || req.socket.remoteAddress
    });

    next();
  } catch (error) {
    console.error('[TenantContext] Error:', error);

    res.status(500).json({
      error: 'Tenant context initialization failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'TENANT_CONTEXT_ERROR'
    });
  }
}

/**
 * Require tenant middleware (use after tenantContext)
 * Ensures tenant context exists before proceeding
 */
export function requireTenant(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.tenant || !req.prisma) {
    res.status(401).json({
      error: 'Tenant context required',
      message: 'This endpoint requires a valid tenant context',
      code: 'TENANT_CONTEXT_MISSING'
    });
    return;
  }
  next();
}

/**
 * Optional tenant middleware (attaches tenant if available, but doesn't require it)
 * Useful for public endpoints that can optionally filter by tenant
 */
export async function optionalTenantContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantSlug = extractTenantSlug(req);

    if (tenantSlug) {
      const publicPrisma = getPublicPrisma();
      const tenant = await publicPrisma.tenant.findUnique({
        where: { slug: tenantSlug },
        select: {
          id: true,
          slug: true,
          schemaName: true,
          status: true,
          planTier: true
        }
      });

      if (tenant && tenant.status === 'active') {
        req.tenant = {
          id: tenant.id,
          slug: tenant.slug,
          schemaName: tenant.schemaName,
          planTier: tenant.planTier,
          status: tenant.status
        };
        req.prisma = await getPrismaForTenant(tenantSlug);
      }
    }

    next();
  } catch (error) {
    // Don't fail the request, just log the error
    console.error('[OptionalTenantContext] Error:', error);
    next();
  }
}
