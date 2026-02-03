/**
 * Schema Provisioning Utility
 *
 * Manages PostgreSQL schema lifecycle for multi-tenant orgs.
 * Uses a "_template" schema cloned from the public schema to provision
 * new tenant schemas with all required tables.
 *
 * Pattern: Clone template schema for each new org
 * Security: Schema names validated against strict regex before use in DDL
 */

import type { PrismaClient } from "@prisma/client";

const TEMPLATE_SCHEMA = "_template";

/** Only lowercase letters, digits, underscores; must start with a letter. */
const SCHEMA_NAME_RE = /^[a-z][a-z0-9_]*$/;

/** Tables to exclude when cloning from the public schema. */
const EXCLUDED_TABLES = ["_prisma_migrations"];

function validateSchemaName(schemaName: string): void {
  if (!SCHEMA_NAME_RE.test(schemaName)) {
    throw new Error(
      `[SchemaProvisioner] Invalid schema name: "${schemaName}". ` +
        "Must match /^[a-z][a-z0-9_]*$/ (lowercase letter start, then letters/digits/underscores).",
    );
  }
}

/**
 * List user-created table names in a given schema.
 * Excludes Prisma internal tables (e.g. _prisma_migrations).
 */
async function listTables(
  prisma: PrismaClient,
  schemaName: string,
): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = $1`,
    schemaName,
  );

  return rows
    .map((r) => r.tablename)
    .filter((name) => !EXCLUDED_TABLES.includes(name));
}

/**
 * Check whether a schema exists in the current database.
 */
async function schemaExists(
  prisma: PrismaClient,
  schemaName: string,
): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ schema_name: string }[]>(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
    schemaName,
  );

  return rows.length > 0;
}

/**
 * Ensure the template schema exists with all tables.
 * Called on first org creation or server startup.
 *
 * Copies table structures (including indexes, constraints, defaults)
 * from the public schema into the _template schema. If the template
 * already exists this is a no-op.
 */
export async function ensureTemplateSchema(
  publicPrisma: PrismaClient,
): Promise<void> {
  const exists = await schemaExists(publicPrisma, TEMPLATE_SCHEMA);

  if (exists) {
    console.log("[SchemaProvisioner] Template schema already exists, skipping creation.");
    return;
  }

  console.log("[SchemaProvisioner] Creating template schema from public schema...");

  await publicPrisma.$queryRawUnsafe(
    `CREATE SCHEMA IF NOT EXISTS "${TEMPLATE_SCHEMA}"`,
  );

  const tables = await listTables(publicPrisma, "public");

  if (tables.length === 0) {
    console.warn(
      "[SchemaProvisioner] No tables found in public schema. Template schema will be empty.",
    );
    return;
  }

  for (const tableName of tables) {
    await publicPrisma.$queryRawUnsafe(
      `CREATE TABLE "${TEMPLATE_SCHEMA}"."${tableName}" (LIKE "public"."${tableName}" INCLUDING ALL)`,
    );
    console.log(`[SchemaProvisioner] Cloned table: ${TEMPLATE_SCHEMA}.${tableName}`);
  }

  console.log(
    `[SchemaProvisioner] Template schema created with ${tables.length} table(s).`,
  );
}

/**
 * Provision a new org schema by cloning from template.
 * Wrapped in a try/catch - drops schema on failure.
 *
 * @param publicPrisma - Prisma client connected to the public schema
 * @param schemaName   - Target schema name (e.g. "tenant_acme_corp")
 * @throws Error if schema name is invalid, template is missing, or DDL fails
 */
export async function provisionOrgSchema(
  publicPrisma: PrismaClient,
  schemaName: string,
): Promise<void> {
  validateSchemaName(schemaName);

  console.log(`[SchemaProvisioner] Provisioning schema: ${schemaName}`);

  // Ensure we have a template to clone from
  await ensureTemplateSchema(publicPrisma);

  try {
    // Create the new schema
    await publicPrisma.$queryRawUnsafe(
      `CREATE SCHEMA "${schemaName}"`,
    );

    // Clone each table from the template
    const tables = await listTables(publicPrisma, TEMPLATE_SCHEMA);

    if (tables.length === 0) {
      console.warn(
        `[SchemaProvisioner] Template schema has no tables. Schema "${schemaName}" will be empty.`,
      );
      return;
    }

    for (const tableName of tables) {
      await publicPrisma.$queryRawUnsafe(
        `CREATE TABLE "${schemaName}"."${tableName}" (LIKE "${TEMPLATE_SCHEMA}"."${tableName}" INCLUDING ALL)`,
      );
    }

    console.log(
      `[SchemaProvisioner] Schema "${schemaName}" provisioned with ${tables.length} table(s).`,
    );
  } catch (error) {
    console.error(
      `[SchemaProvisioner] Failed to provision schema "${schemaName}", rolling back...`,
      error instanceof Error ? error.message : "Unknown error",
    );

    // Clean up on failure
    await publicPrisma.$queryRawUnsafe(
      `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`,
    );

    throw error;
  }
}

/**
 * Drop an org schema completely.
 *
 * @param publicPrisma - Prisma client connected to the public schema
 * @param schemaName   - Schema to drop (e.g. "tenant_acme_corp")
 */
export async function dropOrgSchema(
  publicPrisma: PrismaClient,
  schemaName: string,
): Promise<void> {
  validateSchemaName(schemaName);

  console.log(`[SchemaProvisioner] Dropping schema: ${schemaName}`);

  await publicPrisma.$queryRawUnsafe(
    `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`,
  );

  console.log(`[SchemaProvisioner] Schema "${schemaName}" dropped.`);
}
