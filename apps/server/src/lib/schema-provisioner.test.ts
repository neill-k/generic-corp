import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

import {
  ensureTemplateSchema,
  provisionOrgSchema,
  dropOrgSchema,
} from "./schema-provisioner.js";

const mockPrisma = {
  $queryRawUnsafe: vi.fn(),
} as unknown as PrismaClient;

/**
 * Helper to set up mock responses based on SQL query patterns.
 * Routes different queries to different return values so each test
 * can control the "database state" it needs.
 */
function mockQueryRouter(overrides: {
  templateExists?: boolean;
  publicTables?: string[];
  templateTables?: string[];
  failOnCreateTable?: boolean;
}) {
  const {
    templateExists = false,
    publicTables = ["Agent", "Task", "OrgNode", "Message"],
    templateTables = ["Agent", "Task", "OrgNode", "Message"],
    failOnCreateTable = false,
  } = overrides;

  (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockImplementation(
    (sql: string, ...args: unknown[]) => {
      // schemaExists check
      if (sql.includes("information_schema.schemata")) {
        const schemaName = args[0] as string;
        if (schemaName === "_template" && templateExists) {
          return Promise.resolve([{ schema_name: "_template" }]);
        }
        return Promise.resolve([]);
      }

      // listTables
      if (sql.includes("pg_tables")) {
        const schemaName = args[0] as string;
        if (schemaName === "public") {
          return Promise.resolve(
            publicTables.map((t) => ({ tablename: t })),
          );
        }
        if (schemaName === "_template") {
          return Promise.resolve(
            templateTables.map((t) => ({ tablename: t })),
          );
        }
        return Promise.resolve([]);
      }

      // CREATE TABLE - optionally fail to test rollback
      if (sql.includes("CREATE TABLE") && failOnCreateTable) {
        return Promise.reject(new Error("DDL failure: disk full"));
      }

      // All other DDL (CREATE SCHEMA, DROP SCHEMA, CREATE TABLE)
      return Promise.resolve(undefined);
    },
  );
}

describe("schema-provisioner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Silence console output during tests
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // ─── validateSchemaName (tested via provisionOrgSchema / dropOrgSchema) ───

  describe("validateSchemaName (via exported functions)", () => {
    it("rejects schema names starting with a number", async () => {
      await expect(provisionOrgSchema(mockPrisma, "1tenant")).rejects.toThrow(
        '[SchemaProvisioner] Invalid schema name: "1tenant"',
      );
    });

    it("rejects schema names containing hyphens", async () => {
      await expect(provisionOrgSchema(mockPrisma, "tenant-acme")).rejects.toThrow(
        '[SchemaProvisioner] Invalid schema name: "tenant-acme"',
      );
    });

    it("rejects schema names with uppercase letters", async () => {
      await expect(dropOrgSchema(mockPrisma, "TenantAcme")).rejects.toThrow(
        '[SchemaProvisioner] Invalid schema name: "TenantAcme"',
      );
    });

    it("rejects empty string", async () => {
      await expect(provisionOrgSchema(mockPrisma, "")).rejects.toThrow(
        "[SchemaProvisioner] Invalid schema name",
      );
    });

    it("rejects names starting with underscore", async () => {
      await expect(provisionOrgSchema(mockPrisma, "_internal")).rejects.toThrow(
        "[SchemaProvisioner] Invalid schema name",
      );
    });

    it("accepts valid lowercase schema names", async () => {
      mockQueryRouter({ templateExists: true, templateTables: ["Agent"] });

      // Should not throw - valid name passes validation
      await expect(
        provisionOrgSchema(mockPrisma, "tenant_acme_corp"),
      ).resolves.not.toThrow();
    });

    it("accepts single lowercase letter", async () => {
      mockQueryRouter({ templateExists: true, templateTables: ["Agent"] });

      await expect(
        provisionOrgSchema(mockPrisma, "a"),
      ).resolves.not.toThrow();
    });

    it("accepts name with digits after first letter", async () => {
      mockQueryRouter({ templateExists: true, templateTables: ["Agent"] });

      await expect(
        provisionOrgSchema(mockPrisma, "org42"),
      ).resolves.not.toThrow();
    });
  });

  // ─── ensureTemplateSchema ─────────────────────────────────────────────────

  describe("ensureTemplateSchema", () => {
    it("skips creation if template schema already exists", async () => {
      mockQueryRouter({ templateExists: true });

      await ensureTemplateSchema(mockPrisma);

      // Should check existence but never issue CREATE SCHEMA
      const calls = (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mock.calls;
      const createCalls = calls.filter(([sql]: [string]) =>
        sql.includes("CREATE SCHEMA"),
      );
      expect(createCalls).toHaveLength(0);

      // Verify it logged the skip message
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("already exists"),
      );
    });

    it("creates template schema and copies tables from public schema", async () => {
      const publicTables = ["Agent", "Task", "OrgNode", "Message"];
      mockQueryRouter({ templateExists: false, publicTables });

      await ensureTemplateSchema(mockPrisma);

      const calls = (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mock.calls;

      // Should create the template schema
      const createSchemaCalls = calls.filter(([sql]: [string]) =>
        sql.includes('CREATE SCHEMA IF NOT EXISTS "_template"'),
      );
      expect(createSchemaCalls).toHaveLength(1);

      // Should create one table for each public table
      const createTableCalls = calls.filter(([sql]: [string]) =>
        sql.includes("CREATE TABLE") && sql.includes("_template"),
      );
      expect(createTableCalls).toHaveLength(publicTables.length);

      // Verify each table was cloned with INCLUDING ALL
      for (const table of publicTables) {
        const tableCall = createTableCalls.find(([sql]: [string]) =>
          sql.includes(`"_template"."${table}"`) && sql.includes("INCLUDING ALL"),
        );
        expect(tableCall).toBeDefined();
      }
    });

    it("handles empty public schema gracefully with a warning", async () => {
      mockQueryRouter({ templateExists: false, publicTables: [] });

      await ensureTemplateSchema(mockPrisma);

      // Should still create the schema
      const calls = (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mock.calls;
      const createSchemaCalls = calls.filter(([sql]: [string]) =>
        sql.includes("CREATE SCHEMA"),
      );
      expect(createSchemaCalls).toHaveLength(1);

      // Should NOT create any tables
      const createTableCalls = calls.filter(([sql]: [string]) =>
        sql.includes("CREATE TABLE"),
      );
      expect(createTableCalls).toHaveLength(0);

      // Should log a warning about empty schema
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("No tables found in public schema"),
      );
    });

    it("excludes _prisma_migrations from cloned tables", async () => {
      mockQueryRouter({
        templateExists: false,
        publicTables: ["Agent", "_prisma_migrations", "Task"],
      });

      // Override the mock to include _prisma_migrations in raw results
      (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockImplementation(
        (sql: string, ...args: unknown[]) => {
          if (sql.includes("information_schema.schemata")) {
            return Promise.resolve([]);
          }
          if (sql.includes("pg_tables")) {
            // Return all tables including _prisma_migrations
            return Promise.resolve([
              { tablename: "Agent" },
              { tablename: "_prisma_migrations" },
              { tablename: "Task" },
            ]);
          }
          return Promise.resolve(undefined);
        },
      );

      await ensureTemplateSchema(mockPrisma);

      const calls = (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mock.calls;
      const createTableCalls = calls.filter(([sql]: [string]) =>
        sql.includes("CREATE TABLE"),
      );

      // Should only create Agent and Task, not _prisma_migrations
      expect(createTableCalls).toHaveLength(2);
      const createdTableNames = createTableCalls.map(([sql]: [string]) => sql);
      expect(createdTableNames.some((s: string) => s.includes("_prisma_migrations"))).toBe(false);
    });
  });

  // ─── provisionOrgSchema ───────────────────────────────────────────────────

  describe("provisionOrgSchema", () => {
    it("creates schema and copies tables from template", async () => {
      const templateTables = ["Agent", "Task"];
      mockQueryRouter({ templateExists: true, templateTables });

      await provisionOrgSchema(mockPrisma, "tenant_acme");

      const calls = (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mock.calls;

      // Should create the new org schema
      const createSchemaCalls = calls.filter(([sql]: [string]) =>
        sql.includes('CREATE SCHEMA "tenant_acme"'),
      );
      expect(createSchemaCalls).toHaveLength(1);

      // Should clone each template table into the new schema
      const createTableCalls = calls.filter(([sql]: [string]) =>
        sql.includes("CREATE TABLE") && sql.includes('"tenant_acme"'),
      );
      expect(createTableCalls).toHaveLength(templateTables.length);

      // Verify tables are cloned from _template with INCLUDING ALL
      for (const table of templateTables) {
        const tableCall = createTableCalls.find(([sql]: [string]) =>
          sql.includes(`"tenant_acme"."${table}"`) &&
          sql.includes(`"_template"."${table}"`) &&
          sql.includes("INCLUDING ALL"),
        );
        expect(tableCall).toBeDefined();
      }
    });

    it("calls ensureTemplateSchema before provisioning", async () => {
      mockQueryRouter({ templateExists: false, publicTables: ["Agent"], templateTables: ["Agent"] });

      await provisionOrgSchema(mockPrisma, "tenant_beta");

      const calls = (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mock.calls;

      // The first call should be the schemaExists check for _template
      const firstCall = calls[0];
      expect(firstCall[0]).toContain("information_schema.schemata");
      expect(firstCall[1]).toBe("_template");

      // Template creation SQL should appear before the org schema creation
      const createTemplateSqlIndex = calls.findIndex(([sql]: [string]) =>
        sql.includes('CREATE SCHEMA IF NOT EXISTS "_template"'),
      );
      const createOrgSqlIndex = calls.findIndex(([sql]: [string]) =>
        sql.includes('CREATE SCHEMA "tenant_beta"'),
      );
      expect(createTemplateSqlIndex).toBeLessThan(createOrgSqlIndex);
    });

    it("rolls back (drops schema) if table creation fails", async () => {
      mockQueryRouter({ templateExists: true, templateTables: ["Agent", "Task"], failOnCreateTable: true });

      await expect(
        provisionOrgSchema(mockPrisma, "tenant_broken"),
      ).rejects.toThrow("DDL failure: disk full");

      const calls = (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mock.calls;

      // Should have attempted to drop the schema on failure
      const dropCalls = calls.filter(([sql]: [string]) =>
        sql.includes("DROP SCHEMA") && sql.includes("tenant_broken") && sql.includes("CASCADE"),
      );
      expect(dropCalls).toHaveLength(1);

      // Should have logged the error
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to provision schema"),
        expect.any(String),
      );
    });

    it("throws on invalid schema name before making any queries", async () => {
      await expect(
        provisionOrgSchema(mockPrisma, "BAD-NAME"),
      ).rejects.toThrow("[SchemaProvisioner] Invalid schema name");

      // No database queries should have been made
      expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
    });

    it("handles empty template schema with a warning", async () => {
      mockQueryRouter({ templateExists: true, templateTables: [] });

      await provisionOrgSchema(mockPrisma, "tenant_empty");

      // Should still create the org schema
      const calls = (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mock.calls;
      const createSchemaCalls = calls.filter(([sql]: [string]) =>
        sql.includes('CREATE SCHEMA "tenant_empty"'),
      );
      expect(createSchemaCalls).toHaveLength(1);

      // But no tables should be created
      const createTableCalls = calls.filter(([sql]: [string]) =>
        sql.includes("CREATE TABLE") && sql.includes("tenant_empty"),
      );
      expect(createTableCalls).toHaveLength(0);

      // Should warn about empty template
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("Template schema has no tables"),
      );
    });

    it("re-throws the original error after rollback", async () => {
      mockQueryRouter({ templateExists: true, templateTables: ["Agent"], failOnCreateTable: true });

      const thrownError = await provisionOrgSchema(mockPrisma, "tenant_fail").catch(
        (e) => e,
      );

      expect(thrownError).toBeInstanceOf(Error);
      expect((thrownError as Error).message).toBe("DDL failure: disk full");
    });
  });

  // ─── dropOrgSchema ────────────────────────────────────────────────────────

  describe("dropOrgSchema", () => {
    it("drops schema with CASCADE", async () => {
      mockQueryRouter({});

      await dropOrgSchema(mockPrisma, "tenant_old");

      const calls = (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mock.calls;

      // Should issue DROP SCHEMA ... CASCADE
      expect(calls).toHaveLength(1);
      expect(calls[0][0]).toContain("DROP SCHEMA IF EXISTS");
      expect(calls[0][0]).toContain('"tenant_old"');
      expect(calls[0][0]).toContain("CASCADE");
    });

    it("throws on invalid schema name before making any queries", async () => {
      await expect(
        dropOrgSchema(mockPrisma, "INVALID"),
      ).rejects.toThrow("[SchemaProvisioner] Invalid schema name");

      // No database queries should have been made
      expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
    });

    it("throws on schema name with special characters", async () => {
      await expect(
        dropOrgSchema(mockPrisma, "tenant; DROP TABLE"),
      ).rejects.toThrow("[SchemaProvisioner] Invalid schema name");

      expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
    });

    it("logs confirmation after dropping schema", async () => {
      mockQueryRouter({});

      await dropOrgSchema(mockPrisma, "tenant_removed");

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"tenant_removed" dropped'),
      );
    });
  });
});
