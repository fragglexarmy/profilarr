import { logger } from '$logger/logger.ts';
import { runRenameManager } from '../logic/renameManager.ts';
import type { JobDefinition, JobResult } from '../types.ts';

/**
 * Rename manager job
 * Checks for rename configs that are due to run and processes them
 * Each config has its own schedule - this job just checks every 30 minutes
 */
export const renameManagerJob: JobDefinition = {
	name: 'rename_manager',
	description: 'Process file/folder renames for arr instances',
	schedule: '*/30 * * * *', // Every 30 minutes

	handler: async (): Promise<JobResult> => {
		try {
			const result = await runRenameManager();

			// Build output message
			if (result.totalProcessed === 0) {
				return {
					success: true,
					skipped: true,
					output: 'No rename configs due to run'
				};
			}

			const message = `Processed ${result.totalProcessed} config(s): ${result.successCount} successful, ${result.failureCount} failed, ${result.skippedCount} skipped`;

			// Log failures only
			for (const instance of result.instances) {
				if (!instance.success && instance.error) {
					await logger.warn(
						`Rename skipped/failed for "${instance.instanceName}": ${instance.error}`,
						{
							source: 'RenameManagerJob',
							meta: {
								instanceId: instance.instanceId,
								error: instance.error
							}
						}
					);
				}
			}

			// Consider job failed only if all configs failed
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
			const errorMessage = error instanceof Error ? error.message : String(error);

			await logger.error('Rename manager job failed', {
				source: 'RenameManagerJob',
				meta: { error: errorMessage }
			});

			return {
				success: false,
				error: errorMessage
			};
		}
	}
};
