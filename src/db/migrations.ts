import { db } from "./db.ts";
import { logger } from "$logger";

export interface Migration {
  version: number;
  name: string;
  up: string;
  down?: string;
}

/**
 * Migration runner for database schema management
 */
class MigrationRunner {
  private migrationsTable = "migrations";

  /**
   * Initialize the migrations table
   */
  initialize(): void {
    const sql = `
			CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
				version INTEGER PRIMARY KEY,
				name TEXT NOT NULL,
				applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
			)
		`;
    db.exec(sql);
  }

  /**
   * Get the current migration version
   */
  getCurrentVersion(): number {
    const result = db.queryFirst<{ version: number }>(
      `SELECT MAX(version) as version FROM ${this.migrationsTable}`,
    );
    return result?.version ?? 0;
  }

  /**
   * Check if a migration has been applied
   */
  isApplied(version: number): boolean {
    const result = db.queryFirst<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.migrationsTable} WHERE version = ?`,
      version,
    );
    return (result?.count ?? 0) > 0;
  }

  /**
   * Apply a single migration
   */
  private async applyMigration(migration: Migration): Promise<void> {
    try {
      await db.transaction(async () => {
        // Execute the migration
        db.exec(migration.up);

        // Record the migration
        db.execute(
          `INSERT INTO ${this.migrationsTable} (version, name) VALUES (?, ?)`,
          migration.version,
          migration.name,
        );

        await logger.info(
          `✓ Applied migration ${migration.version}: ${migration.name}`,
          {
            source: "MigrationRunner",
          },
        );
      });
    } catch (error) {
      await logger.error(
        `✗ Failed to apply migration ${migration.version}: ${migration.name}`,
        {
          source: "MigrationRunner",
          meta: error,
        },
      );
      throw error;
    }
  }

  /**
   * Rollback a single migration
   */
  private async rollbackMigration(migration: Migration): Promise<void> {
    if (!migration.down) {
      throw new Error(
        `Migration ${migration.version} does not support rollback`,
      );
    }

    try {
      await db.transaction(async () => {
        // Execute the rollback
        db.exec(migration.down!);

        // Remove the migration record
        db.execute(
          `DELETE FROM ${this.migrationsTable} WHERE version = ?`,
          migration.version,
        );

        await logger.info(
          `✓ Rolled back migration ${migration.version}: ${migration.name}`,
          {
            source: "MigrationRunner",
          },
        );
      });
    } catch (error) {
      await logger.error(
        `✗ Failed to rollback migration ${migration.version}: ${migration.name}`,
        {
          source: "MigrationRunner",
          meta: error,
        },
      );
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async up(migrations: Migration[]): Promise<void> {
    this.initialize();

    // Sort migrations by version
    const sortedMigrations = [...migrations].sort((a, b) =>
      a.version - b.version
    );

    let applied = 0;
    for (const migration of sortedMigrations) {
      if (this.isApplied(migration.version)) {
        continue;
      }

      await this.applyMigration(migration);
      applied++;
    }

    if (applied === 0) {
      await logger.info("✓ Database is up to date", {
        source: "MigrationRunner",
      });
    }
  }

  /**
   * Rollback to a specific version
   */
  async down(migrations: Migration[], targetVersion = 0): Promise<void> {
    this.initialize();

    const currentVersion = this.getCurrentVersion();
    if (currentVersion <= targetVersion) {
      await logger.info("✓ Already at target version or below", {
        source: "MigrationRunner",
      });
      return;
    }

    // Sort migrations by version in descending order
    const sortedMigrations = [...migrations]
      .filter((m) => m.version > targetVersion && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version);

    let rolledBack = 0;
    for (const migration of sortedMigrations) {
      if (!this.isApplied(migration.version)) {
        continue;
      }

      await this.rollbackMigration(migration);
      rolledBack++;
    }

    await logger.info(`✓ Rolled back ${rolledBack} migration(s)`, {
      source: "MigrationRunner",
    });
  }

  /**
   * Get list of applied migrations
   */
  getAppliedMigrations(): Array<
    { version: number; name: string; applied_at: string }
  > {
    return db.query(
      `SELECT version, name, applied_at FROM ${this.migrationsTable} ORDER BY version`,
    );
  }

  /**
   * Get list of pending migrations
   */
  getPendingMigrations(migrations: Migration[]): Migration[] {
    const pending: Migration[] = [];
    for (const migration of migrations) {
      if (!this.isApplied(migration.version)) {
        pending.push(migration);
      }
    }
    return pending.sort((a, b) => a.version - b.version);
  }

  /**
   * Reset the database (rollback all migrations)
   */
  async reset(migrations: Migration[]): Promise<void> {
    await this.down(migrations, 0);
  }

  /**
   * Fresh migration (reset and reapply all)
   */
  async fresh(migrations: Migration[]): Promise<void> {
    await logger.warn("⚠ Resetting database...", { source: "MigrationRunner" });
    await this.reset(migrations);
    await logger.info("↻ Reapplying all migrations...", {
      source: "MigrationRunner",
    });
    await this.up(migrations);
  }
}

// Export singleton instance
export const migrationRunner = new MigrationRunner();

/**
 * Helper function to load migrations from files
 * Loads all migration files from src/db/migrations/ directory
 */
export async function loadMigrations(): Promise<Migration[]> {
  const migrations: Migration[] = [];
  const migrationsDir = new URL("./migrations/", import.meta.url).pathname;

  try {
    // Read all files in migrations directory
    for await (const entry of Deno.readDir(migrationsDir)) {
      // Skip template files (starting with _)
      if (entry.name.startsWith("_")) {
        continue;
      }

      // Only process TypeScript/JavaScript files
      if (
        entry.isFile &&
        (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))
      ) {
        try {
          // Dynamically import the migration file
          const migrationModule = await import(/* @vite-ignore */ `./migrations/${entry.name}`);

          // Get the migration object (could be default export or named export)
          const migration = migrationModule.default ||
            migrationModule.migration;

          if (migration && typeof migration.version === "number") {
            migrations.push(migration);
          } else {
            await logger.warn(
              `Migration file ${entry.name} does not export a valid migration`,
              {
                source: "MigrationRunner",
              },
            );
          }
        } catch (error) {
          await logger.error(`Failed to load migration file ${entry.name}`, {
            source: "MigrationRunner",
            meta: error,
          });
        }
      }
    }
  } catch (_error) {
    // If directory doesn't exist or can't be read, return empty array
    await logger.info("No migrations directory found or empty", {
      source: "MigrationRunner",
    });
    return [];
  }

  // Sort by version number
  return migrations.sort((a, b) => a.version - b.version);
}

/**
 * Run migrations
 */
export async function runMigrations(migrations?: Migration[]): Promise<void> {
  const migrationsToRun = migrations ?? await loadMigrations();
  await migrationRunner.up(migrationsToRun);
}
