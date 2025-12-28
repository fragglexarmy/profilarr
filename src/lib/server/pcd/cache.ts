/**
 * PCD Cache - In-memory compiled view of PCD operations
 */

import { Database } from '@jsr/db__sqlite';
import { Kysely } from 'kysely';
import { DenoSqlite3Dialect } from '@soapbox/kysely-deno-sqlite';
import { logger } from '$logger/logger.ts';
import { loadAllOperations, validateOperations } from './ops.ts';
import { disableDatabaseInstance } from '$db/queries/databaseInstances.ts';
import type { PCDDatabase } from './schema.ts';

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
	 */
	async build(): Promise<void> {
		try {
			await logger.info('Building PCD cache', {
				source: 'PCDCache',
				meta: { path: this.pcdPath, databaseInstanceId: this.databaseInstanceId }
			});

			// 1. Create in-memory database
			this.db = new Database(':memory:');

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

			await logger.info(`Loaded ${operations.length} operations`, {
				source: 'PCDCache',
				meta: {
					schema: operations.filter((o) => o.layer === 'schema').length,
					base: operations.filter((o) => o.layer === 'base').length,
					tweaks: operations.filter((o) => o.layer === 'tweaks').length
				}
			});

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

			await logger.info('PCD cache built successfully', {
				source: 'PCDCache',
				meta: { databaseInstanceId: this.databaseInstanceId }
			});
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
			const result = this.db!.prepare('SELECT id FROM custom_formats WHERE name = ?').get(
				name
			) as { id: number } | undefined;
			if (!result) {
				throw new Error(`Custom format not found: ${name}`);
			}
			return result.id;
		});

		// dp(name) - Delay profile lookup by name
		this.db.function('dp', (name: string) => {
			const result = this.db!.prepare('SELECT id FROM delay_profiles WHERE name = ?').get(
				name
			) as { id: number } | undefined;
			if (!result) {
				throw new Error(`Delay profile not found: ${name}`);
			}
			return result.id;
		});

		// tag(name) - Tag lookup by name (creates if not exists)
		this.db.function('tag', (name: string) => {
			const result = this.db!.prepare('SELECT id FROM tags WHERE name = ?').get(
				name
			) as { id: number } | undefined;
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
	query<T = unknown>(sql: string, ...params: (string | number | null | boolean | Uint8Array)[]): T[] {
		if (!this.isBuilt()) {
			throw new Error('Cache not built');
		}

		return this.db!.prepare(sql).all(...params) as T[];
	}

	/**
	 * Execute a raw SQL query and return a single row
	 * Use this in your query functions in pcd/queries/*.ts
	 */
	queryOne<T = unknown>(sql: string, ...params: (string | number | null | boolean | Uint8Array)[]): T | undefined {
		if (!this.isBuilt()) {
			throw new Error('Cache not built');
		}

		return this.db!.prepare(sql).get(...params) as T | undefined;
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
 * Debounce timers - maps database instance ID to timer
 */
const debounceTimers = new Map<number, number>();

/**
 * Debounce delay in milliseconds
 */
const DEBOUNCE_DELAY = 500;

/**
 * Compile a PCD into an in-memory cache
 */
export async function compile(pcdPath: string, databaseInstanceId: number): Promise<void> {
	// Stop any existing watchers
	stopWatch(databaseInstanceId);

	// Close existing cache if present
	const existing = caches.get(databaseInstanceId);
	if (existing) {
		existing.close();
	}

	// Create and build new cache
	const cache = new PCDCache(pcdPath, databaseInstanceId);
	await cache.build();

	// Store in registry
	caches.set(databaseInstanceId, cache);
}

/**
 * Get a compiled cache by database instance ID
 */
export function getCache(databaseInstanceId: number): PCDCache | undefined {
	return caches.get(databaseInstanceId);
}

/**
 * Invalidate a cache (close and remove from registry)
 */
export async function invalidate(databaseInstanceId: number): Promise<void> {
	const cache = caches.get(databaseInstanceId);
	if (cache) {
		cache.close();
		caches.delete(databaseInstanceId);
	}

	// Stop file watcher and debounce timers
	stopWatch(databaseInstanceId);

	await logger.info('Cache invalidated', {
		source: 'PCDCache',
		meta: { databaseInstanceId }
	});
}

/**
 * Invalidate all caches
 */
export async function invalidateAll(): Promise<void> {
	const ids = Array.from(caches.keys());
	for (const id of ids) {
		await invalidate(id);
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

	await logger.info(`Starting file watch on ${pathsToWatch.length} directories`, {
		source: 'PCDCache',
		meta: { paths: pathsToWatch, databaseInstanceId }
	});

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
function stopWatch(databaseInstanceId: number): void {
	const watcher = watchers.get(databaseInstanceId);
	if (watcher) {
		watcher.close();
		watchers.delete(databaseInstanceId);
	}

	// Clear any pending debounce timer
	const timer = debounceTimers.get(databaseInstanceId);
	if (timer) {
		clearTimeout(timer);
		debounceTimers.delete(databaseInstanceId);
	}
}

/**
 * Schedule a rebuild with debouncing
 */
function scheduleRebuild(pcdPath: string, databaseInstanceId: number): void {
	// Clear existing timer
	const existingTimer = debounceTimers.get(databaseInstanceId);
	if (existingTimer) {
		clearTimeout(existingTimer);
	}

	// Schedule new rebuild
	const timer = setTimeout(async () => {
		await logger.info('Rebuilding cache due to file changes', {
			source: 'PCDCache',
			meta: { databaseInstanceId }
		});

		try {
			await compile(pcdPath, databaseInstanceId);
			// Restart watch after rebuild (compile clears watchers)
			await startWatch(pcdPath, databaseInstanceId);
		} catch (error) {
			await logger.error('Failed to rebuild cache', {
				source: 'PCDCache',
				meta: { error: String(error), databaseInstanceId }
			});
		}

		debounceTimers.delete(databaseInstanceId);
	}, DEBOUNCE_DELAY);

	debounceTimers.set(databaseInstanceId, timer);
}
