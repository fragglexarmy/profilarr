/**
 * PCD Cache - In-memory compiled view of PCD operations
 */

import { Database } from '@jsr/db__sqlite';
import { Kysely } from 'kysely';
// @ts-ignore - Deno JSR import not recognized by svelte-check
import { DenoSqlite3Dialect } from '@soapbox/kysely-deno-sqlite';
import { logger } from '$logger/logger.ts';
import { loadAllOperations, validateOperations } from './ops.ts';
import {
	disableDatabaseInstance,
	databaseInstancesQueries
} from '$db/queries/databaseInstances.ts';
import type { PCDDatabase } from '$shared/pcd/types.ts';
import { triggerSyncs } from '$sync/processor.ts';

/**
 * Stats returned from cache build
 */
export interface CacheBuildStats {
	schema: number;
	base: number;
	tweaks: number;
	user: number;
	timing: number;
}

/**
 * PCDCache - Manages an in-memory compiled database for a single PCD
 */
export class PCDCache {
	private db: Database | null = null;
	private kysely: Kysely<PCDDatabase> | null = null;
	private pcdPath: string;
	private databaseInstanceId: number;
	private built = false;

	constructor(pcdPath: string, databaseInstanceId: number) {
		this.pcdPath = pcdPath;
		this.databaseInstanceId = databaseInstanceId;
	}

	/**
	 * Build the cache by executing all operations in layer order
	 * Returns stats about what was loaded
	 */
	async build(): Promise<CacheBuildStats> {
		const startTime = performance.now();

		try {
			// 1. Create in-memory database
			// Enable int64 mode to properly handle large integers (e.g., file sizes in bytes)
			this.db = new Database(':memory:', { int64: true });

			// Enable foreign keys
			this.db.exec('PRAGMA foreign_keys = ON');

			// Initialize Kysely query builder
			this.kysely = new Kysely<PCDDatabase>({
				dialect: new DenoSqlite3Dialect({
					database: this.db
				})
			});

			// 2. Register helper functions
			this.registerHelperFunctions();

			// 3. Load all operations
			const operations = await loadAllOperations(this.pcdPath);
			validateOperations(operations);

			// Count ops per layer
			const stats: CacheBuildStats = {
				schema: operations.filter((o) => o.layer === 'schema').length,
				base: operations.filter((o) => o.layer === 'base').length,
				tweaks: operations.filter((o) => o.layer === 'tweaks').length,
				user: operations.filter((o) => o.layer === 'user').length,
				timing: 0
			};

			// 4. Execute operations in order
			for (const operation of operations) {
				try {
					this.db.exec(operation.sql);
				} catch (error) {
					throw new Error(
						`Failed to execute operation ${operation.filename} in ${operation.layer} layer: ${error}`
					);
				}
			}

			this.built = true;
			stats.timing = Math.round(performance.now() - startTime);

			return stats;
		} catch (error) {
			await logger.error('Failed to build PCD cache', {
				source: 'PCDCache',
				meta: { error: String(error), databaseInstanceId: this.databaseInstanceId }
			});

			// Disable the database instance
			await disableDatabaseInstance(this.databaseInstanceId);

			// Clean up
			this.close();
			throw error;
		}
	}

	/**
	 * Register SQL helper functions (qp, cf, dp, tag)
	 */
	private registerHelperFunctions(): void {
		if (!this.db) return;

		// qp(name) - Quality profile lookup by name
		this.db.function('qp', (name: string) => {
			const result = this.db!.prepare('SELECT id FROM quality_profiles WHERE name = ?').get(
				name
			) as { id: number } | undefined;
			if (!result) {
				throw new Error(`Quality profile not found: ${name}`);
			}
			return result.id;
		});

		// cf(name) - Custom format lookup by name
		this.db.function('cf', (name: string) => {
			const result = this.db!.prepare('SELECT id FROM custom_formats WHERE name = ?').get(name) as
				| { id: number }
				| undefined;
			if (!result) {
				throw new Error(`Custom format not found: ${name}`);
			}
			return result.id;
		});

		// dp(name) - Delay profile lookup by name
		this.db.function('dp', (name: string) => {
			const result = this.db!.prepare('SELECT id FROM delay_profiles WHERE name = ?').get(name) as
				| { id: number }
				| undefined;
			if (!result) {
				throw new Error(`Delay profile not found: ${name}`);
			}
			return result.id;
		});

		// tag(name) - Tag lookup by name (creates if not exists)
		this.db.function('tag', (name: string) => {
			const result = this.db!.prepare('SELECT id FROM tags WHERE name = ?').get(name) as
				| { id: number }
				| undefined;
			if (!result) {
				throw new Error(`Tag not found: ${name}`);
			}
			return result.id;
		});
	}

	/**
	 * Check if cache is built and ready
	 */
	isBuilt(): boolean {
		return this.built && this.db !== null;
	}

	/**
	 * Close the database connection
	 */
	close(): void {
		if (this.kysely) {
			this.kysely.destroy();
			this.kysely = null;
		}
		if (this.db) {
			this.db.close();
			this.db = null;
		}
		this.built = false;
	}

	/**
	 * Get the Kysely query builder
	 * Use this for type-safe queries
	 */
	get kb(): Kysely<PCDDatabase> {
		if (!this.kysely) {
			throw new Error('Cache not built');
		}
		return this.kysely;
	}

	// ============================================================================
	// QUERY API
	// ============================================================================

	/**
	 * Execute a raw SQL query and return all rows
	 * Use this in your query functions in pcd/queries/*.ts
	 */
	query<T = unknown>(
		sql: string,
		...params: (string | number | null | boolean | Uint8Array)[]
	): T[] {
		if (!this.isBuilt()) {
			throw new Error('Cache not built');
		}

		return this.db!.prepare(sql).all(...params) as T[];
	}

	/**
	 * Execute a raw SQL query and return a single row
	 * Use this in your query functions in pcd/queries/*.ts
	 */
	queryOne<T = unknown>(
		sql: string,
		...params: (string | number | null | boolean | Uint8Array)[]
	): T | undefined {
		if (!this.isBuilt()) {
			throw new Error('Cache not built');
		}

		return this.db!.prepare(sql).get(...params) as T | undefined;
	}

	/**
	 * Validate SQL statements by doing a dry-run in a transaction
	 * Returns null if valid, or an error message if invalid
	 *
	 * This is a safety check before writing operations to files.
	 * It catches FK violations, constraint errors, etc.
	 */
	validateSql(sqlStatements: string[]): { valid: boolean; error?: string } {
		if (!this.isBuilt()) {
			return { valid: false, error: 'Cache not built' };
		}

		try {
			// Start a savepoint (nested transaction)
			this.db!.exec('SAVEPOINT validation_check');

			try {
				// Try to execute each statement
				for (const sql of sqlStatements) {
					this.db!.exec(sql);
				}

				// All statements executed successfully
				return { valid: true };
			} finally {
				// Always rollback - this is just a validation check
				this.db!.exec('ROLLBACK TO SAVEPOINT validation_check');
				this.db!.exec('RELEASE SAVEPOINT validation_check');
			}
		} catch (error) {
			// Parse the error to provide a helpful message
			const errorStr = String(error);

			// Common SQLite constraint errors
			if (errorStr.includes('FOREIGN KEY constraint failed')) {
				return {
					valid: false,
					error: `Foreign key constraint failed - referenced entity does not exist. ${errorStr}`
				};
			}
			if (errorStr.includes('UNIQUE constraint failed')) {
				return {
					valid: false,
					error: `Unique constraint failed - duplicate entry. ${errorStr}`
				};
			}
			if (errorStr.includes('NOT NULL constraint failed')) {
				return {
					valid: false,
					error: `Required field is missing. ${errorStr}`
				};
			}
			if (errorStr.includes('CHECK constraint failed')) {
				return {
					valid: false,
					error: `Value validation failed. ${errorStr}`
				};
			}

			return {
				valid: false,
				error: `Database validation failed: ${errorStr}`
			};
		}
	}
}

// ============================================================================
// MODULE-LEVEL REGISTRY AND FUNCTIONS
// ============================================================================

/**
 * Cache registry - maps database instance ID to PCDCache
 */
const caches = new Map<number, PCDCache>();

/**
 * File watchers - maps database instance ID to watcher
 */
const watchers = new Map<number, Deno.FsWatcher>();

/**
 * Debounce timers - maps "databaseInstanceId:pcdPath" to timer
 */
const debounceTimers = new Map<string, number>();

/**
 * Debounce delay in milliseconds
 */
const DEBOUNCE_DELAY = 500;

/**
 * Compile a PCD into an in-memory cache
 * Returns build stats for logging
 */
export async function compile(
	pcdPath: string,
	databaseInstanceId: number
): Promise<CacheBuildStats> {
	// Stop any existing watchers
	stopWatch(databaseInstanceId);

	// Close existing cache if present
	const existing = caches.get(databaseInstanceId);
	if (existing) {
		existing.close();
	}

	// Create and build new cache
	const cache = new PCDCache(pcdPath, databaseInstanceId);
	const stats = await cache.build();

	// Store in registry
	caches.set(databaseInstanceId, cache);

	return stats;
}

/**
 * Get a compiled cache by database instance ID
 */
export function getCache(databaseInstanceId: number): PCDCache | undefined {
	return caches.get(databaseInstanceId);
}

/**
 * Get all currently cached database instance IDs (for debugging)
 */
export function getCachedDatabaseIds(): number[] {
	return Array.from(caches.keys());
}

/**
 * Invalidate a cache (close and remove from registry)
 */
export function invalidate(databaseInstanceId: number): void {
	const cache = caches.get(databaseInstanceId);
	if (cache) {
		cache.close();
		caches.delete(databaseInstanceId);
	}

	// Stop file watcher and debounce timers
	stopWatch(databaseInstanceId);
}

/**
 * Invalidate all caches
 */
export function invalidateAll(): void {
	const ids = Array.from(caches.keys());
	for (const id of ids) {
		invalidate(id);
	}
}

// ============================================================================
// FILE WATCHING
// ============================================================================

/**
 * Start watching PCD directories for changes
 */
export async function startWatch(pcdPath: string, databaseInstanceId: number): Promise<void> {
	// Stop existing watcher if present
	stopWatch(databaseInstanceId);

	const pathsToWatch: string[] = [];

	// Watch ops directory
	const opsPath = `${pcdPath}/ops`;
	try {
		await Deno.stat(opsPath);
		pathsToWatch.push(opsPath);
	} catch {
		// ops directory doesn't exist, skip
	}

	// Watch deps/schema/ops directory
	const schemaOpsPath = `${pcdPath}/deps/schema/ops`;
	try {
		await Deno.stat(schemaOpsPath);
		pathsToWatch.push(schemaOpsPath);
	} catch {
		// schema ops directory doesn't exist, skip
	}

	// Watch tweaks directory (optional)
	const tweaksPath = `${pcdPath}/tweaks`;
	try {
		await Deno.stat(tweaksPath);
		pathsToWatch.push(tweaksPath);
	} catch {
		// tweaks directory doesn't exist, that's ok
	}

	// Watch user_ops directory (create if doesn't exist)
	const userOpsPath = `${pcdPath}/user_ops`;
	try {
		await Deno.mkdir(userOpsPath, { recursive: true });
	} catch (error) {
		if (!(error instanceof Deno.errors.AlreadyExists)) {
			await logger.warn('Failed to create user_ops directory', {
				source: 'PCDCache',
				meta: { error: String(error), pcdPath }
			});
		}
	}
	pathsToWatch.push(userOpsPath);

	if (pathsToWatch.length === 0) {
		await logger.warn('No directories to watch for PCD', {
			source: 'PCDCache',
			meta: { pcdPath, databaseInstanceId }
		});
		return;
	}

	const watcher = Deno.watchFs(pathsToWatch);
	watchers.set(databaseInstanceId, watcher);

	// Process file system events in the background
	(async () => {
		try {
			for await (const event of watcher) {
				// Only rebuild on modify, create, or remove events
				if (['modify', 'create', 'remove'].includes(event.kind)) {
					// Only care about .sql files
					const hasSqlFile = event.paths.some((path) => path.endsWith('.sql'));
					if (!hasSqlFile) continue;

					await logger.debug('File change detected, scheduling rebuild', {
						source: 'PCDCache',
						meta: { event: event.kind, paths: event.paths, databaseInstanceId }
					});

					// Debounce the rebuild
					scheduleRebuild(pcdPath, databaseInstanceId);
				}
			}
		} catch (error) {
			// Watcher was closed or errored
			if (error instanceof Deno.errors.BadResource) {
				// This is expected when we close the watcher
				return;
			}

			await logger.error('File watcher error', {
				source: 'PCDCache',
				meta: { error: String(error), databaseInstanceId }
			});
		}
	})();
}

/**
 * Stop watching a PCD for changes
 */
function stopWatch(databaseInstanceId: number, pcdPath?: string): void {
	const watcher = watchers.get(databaseInstanceId);
	if (watcher) {
		watcher.close();
		watchers.delete(databaseInstanceId);
	}

	// Clear any pending debounce timer for this specific path
	if (pcdPath) {
		const timerKey = `${databaseInstanceId}:${pcdPath}`;
		const timer = debounceTimers.get(timerKey);
		if (timer) {
			clearTimeout(timer);
			debounceTimers.delete(timerKey);
		}
	} else {
		// Clear all timers for this databaseInstanceId (fallback)
		for (const [key, timer] of debounceTimers.entries()) {
			if (key.startsWith(`${databaseInstanceId}:`)) {
				clearTimeout(timer);
				debounceTimers.delete(key);
			}
		}
	}
}

/**
 * Schedule a rebuild with debouncing
 */
function scheduleRebuild(pcdPath: string, databaseInstanceId: number): void {
	const timerKey = `${databaseInstanceId}:${pcdPath}`;

	// Clear existing timer for this specific path
	const existingTimer = debounceTimers.get(timerKey);
	if (existingTimer) {
		clearTimeout(existingTimer);
	}

	// Schedule new rebuild
	const timer = setTimeout(async () => {
		try {
			const stats = await compile(pcdPath, databaseInstanceId);
			// Restart watch after rebuild (compile clears watchers)
			await startWatch(pcdPath, databaseInstanceId);

			// Get database name for logging
			const instance = databaseInstancesQueries.getById(databaseInstanceId);
			const name = instance?.name ?? `ID:${databaseInstanceId}`;

			await logger.debug(`Rebuild cache "${name}"`, {
				source: 'PCDCache',
				meta: {
					schema: stats.schema,
					base: stats.base,
					tweaks: stats.tweaks,
					user: stats.user,
					timing: `${stats.timing}ms`
				}
			});

			// Trigger arr syncs for configs with on_change trigger
			await triggerSyncs({ event: 'on_change', databaseId: databaseInstanceId });
		} catch (error) {
			await logger.error('Failed to rebuild cache', {
				source: 'PCDCache',
				meta: { error: String(error), databaseInstanceId, pcdPath }
			});
		}

		debounceTimers.delete(timerKey);
	}, DEBOUNCE_DELAY) as unknown as number;

	debounceTimers.set(timerKey, timer);
}
