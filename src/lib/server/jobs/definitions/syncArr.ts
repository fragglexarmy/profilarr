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
	schedule: '*/5 * * * *', // Every 5 minutes (on_pull/on_change trigger directly)

	handler: async (): Promise<JobResult> => {
		try {
			const result = await syncArr();

			// Handle based on outcome
			switch (result.outcome) {
				case 'skipped':
					return {
						success: true,
						skipped: true,
						output: 'No pending syncs'
					};

				case 'success':
					return {
						success: true,
						output: `Sync completed: ${result.successCount} successful (${result.totalProcessed} total)`
					};

				case 'partial': {
					// Log errors for failed syncs
					for (const sync of result.syncs) {
						if (!sync.success) {
							await logger.error(`Failed to sync ${sync.section} to ${sync.instanceName}`, {
								source: 'SyncArrJob',
								meta: { instanceId: sync.instanceId, section: sync.section, error: sync.error }
							});
						}
					}
					// Partial success still returns success=true but with warning in output
					return {
						success: true,
						output: `Sync partially completed: ${result.successCount} successful, ${result.failureCount} failed (${result.totalProcessed} total)`
					};
				}

				case 'failed': {
					// Log all errors
					for (const sync of result.syncs) {
						if (!sync.success) {
							await logger.error(`Failed to sync ${sync.section} to ${sync.instanceName}`, {
								source: 'SyncArrJob',
								meta: { instanceId: sync.instanceId, section: sync.section, error: sync.error }
							});
						}
					}
					return {
						success: false,
						error: `Sync failed: all ${result.failureCount} syncs failed`
					};
				}
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}
};
