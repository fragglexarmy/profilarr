/**
 * Core sync logic for PCD auto-sync
 * Checks for databases that need syncing and pulls updates if auto_pull is enabled
 */

import { pcdManager } from '$pcd/pcd.ts';
import { notify } from '$notifications/builder.ts';
import { NotificationTypes } from '$notifications/types.ts';

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

	for (const db of databases) {
		try {
			// Check for updates
			const updateInfo = await pcdManager.checkForUpdates(db.id);

			if (!updateInfo.hasUpdates) {
				// No updates available, just mark as checked
				statuses.push({
					id: db.id,
					name: db.name,
					success: true,
					updatesPulled: 0
				});
				successCount++;
				continue;
			}

			// Updates are available
			if (db.auto_pull === 1) {
				// Auto-pull is enabled, sync the database
				const syncResult = await pcdManager.sync(db.id);

				if (syncResult.success) {
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
				// Auto-pull is disabled, notify about available updates
				await notify(NotificationTypes.PCD_UPDATES_AVAILABLE)
					.title('Database Updates Available')
					.message(`Updates are available for database "${db.name}" (${updateInfo.commitsBehind} commit${updateInfo.commitsBehind === 1 ? '' : 's'} behind)`)
					.meta({ databaseId: db.id, databaseName: db.name, commitsBehind: updateInfo.commitsBehind })
					.send();

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
