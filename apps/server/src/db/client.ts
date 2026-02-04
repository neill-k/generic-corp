import { PrismaClient } from "@prisma/client";

/**
 * @deprecated Use dependency-injected PrismaClient instead.
 * Only seed scripts and migration utilities should import this directly.
 */
export const db = new PrismaClient();
