import { logger } from '$logger/logger.ts';
import { runUpgradeManager } from '../logic/upgradeManager.ts';
import type { JobDefinition, JobResult } from '../types.ts';

/**
 * Upgrade manager job
 * Checks for upgrade configs that are due to run and processes them
 * Each config has its own schedule - this job just checks every 30 minutes
 */
export const upgradeManagerJob: JobDefinition = {
	name: 'upgrade_manager',
	description: 'Process library upgrades for arr instances',
	schedule: '*/30 * * * *', // Every 30 minutes

	handler: async (): Promise<JobResult> => {
		try {
			const result = await runUpgradeManager();

			// Build output message
			if (result.totalProcessed === 0) {
				return {
					success: true,
					output: 'No upgrade configs due to run'
				};
			}

			const message = `Processed ${result.totalProcessed} config(s): ${result.successCount} successful, ${result.failureCount} failed, ${result.skippedCount} skipped`;

			// Log failures only
			for (const instance of result.instances) {
				if (!instance.success && instance.error) {
					await logger.warn(
						`Upgrade skipped/failed for "${instance.instanceName}": ${instance.error}`,
						{
							source: 'UpgradeManagerJob',
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

			await logger.error('Upgrade manager job failed', {
				source: 'UpgradeManagerJob',
				meta: { error: errorMessage }
			});

			return {
				success: false,
				error: errorMessage
			};
		}
	}
};
