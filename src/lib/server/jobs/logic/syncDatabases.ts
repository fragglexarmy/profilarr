/**
 * Core sync logic for PCD auto-sync
 * Checks for databases that need syncing and pulls updates if auto_pull is enabled
 */

import { pcdManager } from '$pcd/pcd.ts';
import { notify } from '$notifications/builder.ts';
import { NotificationTypes } from '$notifications/types.ts';
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
					await notify(NotificationTypes.PCD_SYNC_SUCCESS)
						.title('Database Synced Successfully')
						.message(`Database "${db.name}" has been updated (${syncResult.commitsBehind} commit${syncResult.commitsBehind === 1 ? '' : 's'} pulled)`)
						.meta({ databaseId: db.id, databaseName: db.name, commitsPulled: syncResult.commitsBehind })
						.send();

					statuses.push({
						id: db.id,
						name: db.name,
						success: true,
						updatesPulled: syncResult.commitsBehind
					});
					successCount++;
				} else {
					await notify(NotificationTypes.PCD_SYNC_FAILED)
						.title('Database Sync Failed')
						.message(`Failed to sync database "${db.name}": ${syncResult.error}`)
						.meta({ databaseId: db.id, databaseName: db.name, error: syncResult.error })
						.send();

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
				await notify(NotificationTypes.PCD_UPDATES_AVAILABLE)
					.title('Database Updates Available')
					.message(`Updates are available for database "${db.name}" (${updateInfo.commitsBehind} commit${updateInfo.commitsBehind === 1 ? '' : 's'} behind)`)
					.meta({ databaseId: db.id, databaseName: db.name, commitsBehind: updateInfo.commitsBehind })
					.send();

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
