import { logger } from '$logger/logger.ts';
import { syncDatabases } from '../logic/syncDatabases.ts';
import type { JobDefinition, JobResult } from '../types.ts';

/**
 * Sync PCD databases job
 * Checks for databases that need syncing and pulls updates if auto_pull is enabled
 */
export const syncDatabasesJob: JobDefinition = {
	name: 'sync_databases',
	description: 'Auto-sync PCD databases with remote repositories',
	schedule: '*/5 minutes',

	handler: async (): Promise<JobResult> => {
		try {
			await logger.info('Starting database sync job', {
				source: 'SyncDatabasesJob'
			});

			// Run sync
			const result = await syncDatabases();

			// Log results for each database
			for (const db of result.databases) {
				if (db.success) {
					if (db.updatesPulled > 0) {
						await logger.info(`Synced database: ${db.name}`, {
							source: 'SyncDatabasesJob',
							meta: { databaseId: db.id, updatesPulled: db.updatesPulled }
						});
					}
				} else {
					await logger.error(`Failed to sync database: ${db.name}`, {
						source: 'SyncDatabasesJob',
						meta: { databaseId: db.id, error: db.error }
					});
				}
			}

			const message = `Sync completed: ${result.successCount} successful, ${result.failureCount} failed (${result.totalChecked} total)`;

			if (result.failureCount > 0 && result.successCount === 0) {
				return {
					success: false,
					error: message
				};
			}

			return {
				success: true,
				output: message
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}
};
