import { logger } from '$logger/logger.ts';
import { syncArr } from '../logic/syncArr.ts';
import type { JobDefinition, JobResult } from '../types.ts';

/**
 * Sync arr instances job
 * Processes pending syncs and pushes profiles/settings to arr instances
 */
export const syncArrJob: JobDefinition = {
	name: 'sync_arr',
	description: 'Sync PCD profiles and settings to arr instances',
	schedule: '* * * * *', // Every minute

	handler: async (): Promise<JobResult> => {
		try {
			const result = await syncArr();

			// Nothing to process
			if (result.totalProcessed === 0) {
				return {
					success: true,
					output: 'No pending syncs'
				};
			}

			// Log errors only
			for (const sync of result.syncs) {
				if (!sync.success) {
					await logger.error(`Failed to sync ${sync.section} to ${sync.instanceName}`, {
						source: 'SyncArrJob',
						meta: { instanceId: sync.instanceId, section: sync.section, error: sync.error }
					});
				}
			}

			const message = `Sync completed: ${result.successCount} successful, ${result.failureCount} failed (${result.totalProcessed} total)`;

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
