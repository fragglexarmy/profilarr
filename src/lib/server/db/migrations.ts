import { db } from './db.ts';
import { logger } from '$logger/logger.ts';

// Static imports for all migrations
import { migration as migration001 } from './migrations/001_create_arr_instances.ts';
import { migration as migration002 } from './migrations/002_remove_sync_profile.ts';
import { migration as migration003 } from './migrations/003_create_log_settings.ts';
import { migration as migration004 } from './migrations/004_create_jobs_tables.ts';
import { migration as migration005 } from './migrations/005_create_backup_settings.ts';
import { migration as migration006 } from './migrations/006_simplify_log_settings.ts';
import { migration as migration007 } from './migrations/007_create_notification_tables.ts';
import { migration as migration008 } from './migrations/008_create_database_instances.ts';
import { migration as migration009 } from './migrations/009_add_personal_access_token.ts';
import { migration as migration010 } from './migrations/010_add_is_private.ts';
import { migration as migration011 } from './migrations/011_create_upgrade_configs.ts';
import { migration as migration012 } from './migrations/012_add_upgrade_last_run.ts';
import { migration as migration013 } from './migrations/013_add_upgrade_dry_run.ts';
import { migration as migration014 } from './migrations/014_create_ai_settings.ts';
import { migration as migration015 } from './migrations/015_create_arr_sync_tables.ts';
import { migration as migration016 } from './migrations/016_add_should_sync_flags.ts';
import { migration as migration017 } from './migrations/017_create_regex101_cache.ts';

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
	private migrationsTable = 'migrations';

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
			`SELECT MAX(version) as version FROM ${this.migrationsTable}`
		);
		return result?.version ?? 0;
	}

	/**
	 * Check if a migration has been applied
	 */
	isApplied(version: number): boolean {
		const result = db.queryFirst<{ count: number }>(
			`SELECT COUNT(*) as count FROM ${this.migrationsTable} WHERE version = ?`,
			version
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
					migration.name
				);

				await logger.info(`✓ Applied migration ${migration.version}: ${migration.name}`, {
					source: 'MigrationRunner'
				});
			});
		} catch (error) {
			await logger.error(`✗ Failed to apply migration ${migration.version}: ${migration.name}`, {
				source: 'MigrationRunner',
				meta: error
			});
			throw error;
		}
	}

	/**
	 * Rollback a single migration
	 */
	private async rollbackMigration(migration: Migration): Promise<void> {
		if (!migration.down) {
			throw new Error(`Migration ${migration.version} does not support rollback`);
		}

		try {
			await db.transaction(async () => {
				// Execute the rollback
				db.exec(migration.down!);

				// Remove the migration record
				db.execute(`DELETE FROM ${this.migrationsTable} WHERE version = ?`, migration.version);

				await logger.info(`✓ Rolled back migration ${migration.version}: ${migration.name}`, {
					source: 'MigrationRunner'
				});
			});
		} catch (error) {
			await logger.error(`✗ Failed to rollback migration ${migration.version}: ${migration.name}`, {
				source: 'MigrationRunner',
				meta: error
			});
			throw error;
		}
	}

	/**
	 * Run all pending migrations
	 */
	async up(migrations: Migration[]): Promise<void> {
		this.initialize();

		// Sort migrations by version
		const sortedMigrations = [...migrations].sort((a, b) => a.version - b.version);

		let applied = 0;
		for (const migration of sortedMigrations) {
			if (this.isApplied(migration.version)) {
				continue;
			}

			await this.applyMigration(migration);
			applied++;
		}

		if (applied === 0) {
			await logger.info('✓ Database is up to date', {
				source: 'MigrationRunner'
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
			await logger.info('✓ Already at target version or below', {
				source: 'MigrationRunner'
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
			source: 'MigrationRunner'
		});
	}

	/**
	 * Get list of applied migrations
	 */
	getAppliedMigrations(): Array<{ version: number; name: string; applied_at: string }> {
		return db.query(
			`SELECT version, name, applied_at FROM ${this.migrationsTable} ORDER BY version`
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
		await logger.warn('⚠ Resetting database...', { source: 'MigrationRunner' });
		await this.reset(migrations);
		await logger.info('↻ Reapplying all migrations...', {
			source: 'MigrationRunner'
		});
		await this.up(migrations);
	}
}

// Export singleton instance
export const migrationRunner = new MigrationRunner();

/**
 * Helper function to load migrations
 * Returns all statically imported migrations
 */
export function loadMigrations(): Migration[] {
	const migrations: Migration[] = [
		migration001,
		migration002,
		migration003,
		migration004,
		migration005,
		migration006,
		migration007,
		migration008,
		migration009,
		migration010,
		migration011,
		migration012,
		migration013,
		migration014,
		migration015,
		migration016,
		migration017
	];

	// Sort by version number
	return migrations.sort((a, b) => a.version - b.version);
}

/**
 * Run migrations
 */
export async function runMigrations(migrations?: Migration[]): Promise<void> {
	const migrationsToRun = migrations ?? loadMigrations();
	await migrationRunner.up(migrationsToRun);
}
