import { GcPlugin, StorageProvider } from "@generic-corp/sdk";
import type { PluginManifest, PluginContext, StorageEntry } from "@generic-corp/sdk";
import Database from "better-sqlite3";
import type BetterSqlite3 from "better-sqlite3";

export class SqliteStorageProvider extends StorageProvider {
  readonly providerId = "local-sqlite-storage";
  readonly providerName = "Local SQLite Storage";
  private db: BetterSqlite3.Database | null = null;
  private readonly dbPath: string;

  constructor(dbPath: string) {
    super();
    this.dbPath = dbPath;
  }

  override async initialize(): Promise<void> {
    this.db = new Database(this.dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kv_store (
        namespace TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (namespace, key)
      )
    `);
  }

  override async dispose(): Promise<void> {
    this.db?.close();
    this.db = null;
  }

  override async get(namespace: string, key: string): Promise<string | undefined> {
    if (!this.db) return undefined;
    const row = this.db.prepare("SELECT value FROM kv_store WHERE namespace = ? AND key = ?").get(namespace, key) as { value: string } | undefined;
    return row?.value;
  }

  override async set(namespace: string, key: string, value: string): Promise<void> {
    if (!this.db) return;
    this.db.prepare(`
      INSERT INTO kv_store (namespace, key, value, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT (namespace, key)
      DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run(namespace, key, value);
  }

  override async delete(namespace: string, key: string): Promise<boolean> {
    if (!this.db) return false;
    const result = this.db.prepare("DELETE FROM kv_store WHERE namespace = ? AND key = ?").run(namespace, key);
    return result.changes > 0;
  }

  override async list(namespace: string): Promise<StorageEntry[]> {
    if (!this.db) return [];
    const rows = this.db.prepare("SELECT key, value, updated_at FROM kv_store WHERE namespace = ? ORDER BY key").all(namespace) as Array<{ key: string; value: string; updated_at: string }>;
    return rows.map((r) => ({ key: r.key, value: r.value, updatedAt: r.updated_at }));
  }
}

export class LocalSqliteStoragePlugin extends GcPlugin {
  readonly manifest: PluginManifest = {
    id: "local-sqlite-storage",
    name: "Local SQLite Storage",
    version: "0.1.0",
    description: "File-based SQLite storage provider for local/development use",
    author: "Generic Corp",
    license: "FSL-1.1-MIT",
    tags: ["storage", "local"],
  };

  private provider: SqliteStorageProvider | null = null;

  override async onRegister(context: PluginContext): Promise<void> {
    const dbPath = context.config.get<string>("dbPath", "./gc-storage.sqlite");
    this.provider = new SqliteStorageProvider(dbPath);
    (context.services as unknown as { register: (type: string, provider: StorageProvider, primary: boolean) => void }).register?.("storage", this.provider, true);
  }

  override async onInitialize(): Promise<void> {
    if (this.provider) {
      await this.provider.initialize();
    }
  }

  override async onShutdown(): Promise<void> {
    if (this.provider) {
      await this.provider.dispose();
    }
  }
}
