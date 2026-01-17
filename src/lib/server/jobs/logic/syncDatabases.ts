/**
 * Core sync logic for PCD auto-sync
 * Checks for databases that need syncing and pulls updates if auto_pull is enabled
 */

import { pcdManager } from '$pcd/pcd.ts';
import { logger } from '$logger/logger.ts';
import { databaseInstancesQueries } from '$db/queries/databaseInstances.ts';

const LOG_SOURCE = 'SyncDatabases';

export interface DatabaseSyncStatus {
	id: number;
	name: string;
	success: boolean;
	updatesPulled: number;
	error?: string;
}

export interface SyncDatabasesResult {
	totalChecked: number;
	successCount: number;
	failureCount: number;
	databases: DatabaseSyncStatus[];
}

/**
 * Sync all databases that are due for auto-sync
 * Checks databases with sync_strategy > 0 that haven't been synced within their interval
 */
export async function syncDatabases(): Promise<SyncDatabasesResult> {
	const databases = pcdManager.getDueForSync();

	const totalChecked = databases.length;
	let successCount = 0;
	let failureCount = 0;
	const statuses: DatabaseSyncStatus[] = [];

	await logger.debug(`Found ${totalChecked} database(s) due for sync`, {
		source: LOG_SOURCE,
		meta: { databaseIds: databases.map((d) => d.id) }
	});

	for (const db of databases) {
		await logger.debug(`Checking "${db.name}" for updates`, {
			source: LOG_SOURCE,
			meta: {
				id: db.id,
				syncStrategy: db.sync_strategy,
				autoPull: db.auto_pull,
				lastSyncedAt: db.last_synced_at
			}
		});

		try {
			// Check for updates
			const updateInfo = await pcdManager.checkForUpdates(db.id);

			if (!updateInfo.hasUpdates) {
				await logger.debug(`No updates for "${db.name}"`, { source: LOG_SOURCE });
				databaseInstancesQueries.updateSyncedAt(db.id);
				statuses.push({
					id: db.id,
					name: db.name,
					success: true,
					updatesPulled: 0
				});
				successCount++;
				continue;
			}

			await logger.debug(`Updates available for "${db.name}"`, {
				source: LOG_SOURCE,
				meta: { commitsBehind: updateInfo.commitsBehind }
			});

			// Updates are available
			if (db.auto_pull === 1) {
				await logger.debug(`Pulling updates for "${db.name}"`, { source: LOG_SOURCE });
				const syncResult = await pcdManager.sync(db.id);

				if (syncResult.success) {
					await logger.debug(`Pull succeeded for "${db.name}"`, {
						source: LOG_SOURCE,
						meta: { commitsPulled: syncResult.commitsBehind }
					});

					statuses.push({
						id: db.id,
						name: db.name,
						success: true,
						updatesPulled: syncResult.commitsBehind
					});
					successCount++;
				} else {
					statuses.push({
						id: db.id,
						name: db.name,
						success: false,
						updatesPulled: 0,
						error: syncResult.error
					});
					failureCount++;
				}
			} else {
				await logger.debug(`Auto-pull disabled for "${db.name}", notifying only`, {
					source: LOG_SOURCE
				});

				databaseInstancesQueries.updateSyncedAt(db.id);
				statuses.push({
					id: db.id,
					name: db.name,
					success: true,
					updatesPulled: 0
				});
				successCount++;
			}
		} catch (error) {
			statuses.push({
				id: db.id,
				name: db.name,
				success: false,
				updatesPulled: 0,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
			failureCount++;
		}
	}

	return {
		totalChecked,
		successCount,
		failureCount,
		databases: statuses
	};
}
