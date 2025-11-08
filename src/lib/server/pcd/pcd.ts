/**
 * PCD Manager - High-level orchestration for PCD lifecycle
 */

import * as git from '$utils/git/git.ts';
import { databaseInstancesQueries } from '$db/queries/databaseInstances.ts';
import type { DatabaseInstance } from '$db/queries/databaseInstances.ts';
import { loadManifest, type Manifest } from './manifest.ts';
import { getPCDPath } from './paths.ts';
import { processDependencies } from './deps.ts';
import { notificationManager } from '$notifications/NotificationManager.ts';
import { compile, invalidate, startWatch, getCache } from './cache.ts';
import { logger } from '$logger/logger.ts';

export interface LinkOptions {
	repositoryUrl: string;
	name: string;
	branch?: string;
	syncStrategy?: number;
	autoPull?: boolean;
	personalAccessToken?: string;
}

export interface SyncResult {
	success: boolean;
	commitsBehind: number;
	error?: string;
}

/**
 * PCD Manager - Manages the lifecycle of Profilarr Compliant Databases
 */
class PCDManager {
	/**
	 * Link a new PCD repository
	 */
	async link(options: LinkOptions): Promise<DatabaseInstance> {
		await logger.debug('Starting database link operation', {
			source: 'PCDManager',
			meta: {
				name: options.name,
				repositoryUrl: options.repositoryUrl,
				branch: options.branch
			}
		});

		// Generate UUID for storage
		const uuid = crypto.randomUUID();
		const localPath = getPCDPath(uuid);

		try {
			// Clone the repository and detect if it's private
			const isPrivate = await git.clone(options.repositoryUrl, localPath, options.branch, options.personalAccessToken);

			// Validate manifest (loadManifest throws if invalid)
			await loadManifest(localPath);

			// Process dependencies (clone and validate)
			await processDependencies(localPath);

			// Insert into database
			const id = databaseInstancesQueries.create({
				uuid,
				name: options.name,
				repositoryUrl: options.repositoryUrl,
				localPath,
				syncStrategy: options.syncStrategy,
				autoPull: options.autoPull,
				personalAccessToken: options.personalAccessToken,
				isPrivate
			});

			// Get and return the created instance
			const instance = databaseInstancesQueries.getById(id);
			if (!instance) {
				throw new Error('Failed to retrieve created database instance');
			}

			// Compile cache and start watching (only if enabled)
			if (instance.enabled) {
				try {
					await compile(localPath, id);
					await startWatch(localPath, id);
				} catch (error) {
					// Log error but don't fail the link operation
					await logger.error('Failed to compile PCD cache after linking', {
						source: 'PCDManager',
						meta: { error: String(error), databaseId: id }
					});
				}
			}

			// Send notification
			await notificationManager.notify({
				type: 'pcd.linked',
				title: 'Database Linked',
				message: `Database "${options.name}" has been linked successfully`,
				metadata: {
					databaseId: id,
					databaseName: options.name,
					repositoryUrl: options.repositoryUrl
				}
			});

			return instance;
		} catch (error) {
			// Cleanup on failure - remove cloned directory
			try {
				await Deno.remove(localPath, { recursive: true });
			} catch {
				// Ignore cleanup errors
			}
			throw error;
		}
	}

	/**
	 * Unlink a PCD repository
	 */
	async unlink(id: number): Promise<void> {
		const instance = databaseInstancesQueries.getById(id);
		if (!instance) {
			throw new Error(`Database instance ${id} not found`);
		}

		// Store name and URL for notification
		const { name, repository_url } = instance;

		// Invalidate cache first
		await invalidate(id);

		// Delete from database
		databaseInstancesQueries.delete(id);

		// Then cleanup filesystem
		try {
			await Deno.remove(instance.local_path, { recursive: true });
		} catch (error) {
			// Log but don't throw - database entry is already deleted
			console.error(`Failed to remove PCD directory ${instance.local_path}:`, error);
		}

		// Send notification
		await notificationManager.notify({
			type: 'pcd.unlinked',
			title: 'Database Unlinked',
			message: `Database "${name}" has been removed`,
			metadata: {
				databaseId: id,
				databaseName: name,
				repositoryUrl: repository_url
			}
		});
	}

	/**
	 * Sync a PCD repository (pull updates)
	 */
	async sync(id: number): Promise<SyncResult> {
		const instance = databaseInstancesQueries.getById(id);
		if (!instance) {
			throw new Error(`Database instance ${id} not found`);
		}

		try {
			// Check for updates first
			const updateInfo = await git.checkForUpdates(instance.local_path);

			if (!updateInfo.hasUpdates) {
				// Already up to date
				databaseInstancesQueries.updateSyncedAt(id);
				return {
					success: true,
					commitsBehind: 0
				};
			}

			// Pull updates
			await git.pull(instance.local_path);

			// Update last_synced_at
			databaseInstancesQueries.updateSyncedAt(id);

			// Recompile cache and restart watching (only if enabled)
			if (instance.enabled) {
				try {
					await compile(instance.local_path, id);
					await startWatch(instance.local_path, id);
				} catch (error) {
					await logger.error('Failed to recompile PCD cache after sync', {
						source: 'PCDManager',
						meta: { error: String(error), databaseId: id }
					});
				}
			}

			return {
				success: true,
				commitsBehind: updateInfo.commitsBehind
			};
		} catch (error) {
			return {
				success: false,
				commitsBehind: 0,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Check for available updates without pulling
	 */
	async checkForUpdates(id: number): Promise<git.UpdateInfo> {
		const instance = databaseInstancesQueries.getById(id);
		if (!instance) {
			throw new Error(`Database instance ${id} not found`);
		}

		return await git.checkForUpdates(instance.local_path);
	}

	/**
	 * Get parsed manifest for a PCD
	 */
	async getManifest(id: number): Promise<Manifest> {
		const instance = databaseInstancesQueries.getById(id);
		if (!instance) {
			throw new Error(`Database instance ${id} not found`);
		}

		return await loadManifest(instance.local_path);
	}

	/**
	 * Switch branch for a PCD
	 */
	async switchBranch(id: number, branch: string): Promise<void> {
		const instance = databaseInstancesQueries.getById(id);
		if (!instance) {
			throw new Error(`Database instance ${id} not found`);
		}

		await git.checkout(instance.local_path, branch);
		await git.pull(instance.local_path);
		databaseInstancesQueries.updateSyncedAt(id);
	}

	/**
	 * Get git status for a PCD
	 */
	async getStatus(id: number): Promise<git.GitStatus> {
		const instance = databaseInstancesQueries.getById(id);
		if (!instance) {
			throw new Error(`Database instance ${id} not found`);
		}

		return await git.getStatus(instance.local_path);
	}

	/**
	 * Get all PCDs
	 */
	getAll(): DatabaseInstance[] {
		return databaseInstancesQueries.getAll();
	}

	/**
	 * Get PCD by ID
	 */
	getById(id: number): DatabaseInstance | undefined {
		return databaseInstancesQueries.getById(id);
	}

	/**
	 * Get PCDs that need auto-sync
	 */
	getDueForSync(): DatabaseInstance[] {
		return databaseInstancesQueries.getDueForSync();
	}

	/**
	 * Initialize PCD caches for all enabled databases
	 * Should be called on application startup
	 */
	async initialize(): Promise<void> {
		await logger.info('Initializing PCD caches', { source: 'PCDManager' });

		const instances = databaseInstancesQueries.getAll();
		const enabledInstances = instances.filter((instance) => instance.enabled);

		await logger.info(`Found ${enabledInstances.length} enabled databases to compile`, {
			source: 'PCDManager',
			meta: {
				total: instances.length,
				enabled: enabledInstances.length
			}
		});

		// Compile and watch all enabled instances
		for (const instance of enabledInstances) {
			try {
				await logger.info(`Compiling cache for database: ${instance.name}`, {
					source: 'PCDManager',
					meta: { databaseId: instance.id }
				});

				await compile(instance.local_path, instance.id);
				await startWatch(instance.local_path, instance.id);

				await logger.info(`Successfully compiled cache for: ${instance.name}`, {
					source: 'PCDManager',
					meta: { databaseId: instance.id }
				});
			} catch (error) {
				await logger.error(`Failed to compile cache for: ${instance.name}`, {
					source: 'PCDManager',
					meta: { error: String(error), databaseId: instance.id }
				});
			}
		}

		await logger.info('PCD cache initialization complete', { source: 'PCDManager' });
	}

	/**
	 * Get the cache for a database instance
	 */
	getCache(id: number) {
		return getCache(id);
	}
}

// Export singleton instance
export const pcdManager = new PCDManager();
