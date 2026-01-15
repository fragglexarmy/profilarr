import { logger } from '$logger/logger.ts';
import { runUpgradeManager } from '../logic/upgradeManager.ts';
import { notify } from '$notifications/builder.ts';
import { NotificationTypes } from '$notifications/types.ts';
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
					await logger.warn(`Upgrade skipped/failed for "${instance.instanceName}": ${instance.error}`, {
						source: 'UpgradeManagerJob',
						meta: {
							instanceId: instance.instanceId,
							error: instance.error
						}
					});
				}
			}

			// Send notification summary (only if something was processed, excluding skipped)
			const processedCount = result.successCount + result.failureCount;
			if (processedCount > 0) {
				const successfulInstances = result.instances.filter((i) => i.success);
				const failedInstances = result.instances.filter((i) => !i.success && i.error && !i.error.includes('disabled') && !i.error.includes('not yet supported'));
				const hasDryRun = result.instances.some((i) => i.dryRun);

				// Build message lines for each successful instance
				const messageLines: string[] = [];
				for (const inst of successfulInstances) {
					const dryRunLabel = inst.dryRun ? ' [DRY RUN]' : '';
					messageLines.push(`**${inst.instanceName}: ${inst.filterName}${dryRunLabel}**`);
					messageLines.push(`Filter: ${inst.matchedCount} matched → ${inst.afterCooldown} after cooldown`);
					messageLines.push(`Selection: ${inst.itemsSearched}/${inst.itemsRequested} items`);
					if (inst.items && inst.items.length > 0) {
						messageLines.push(`Items: ${inst.items.join(', ')}`);
					}
					messageLines.push('');
				}

				// Add failed instances
				for (const inst of failedInstances) {
					messageLines.push(`**${inst.instanceName}: Failed**`);
					messageLines.push(`Error: ${inst.error}`);
					messageLines.push('');
				}

				const notificationType =
					result.failureCount === 0
						? NotificationTypes.UPGRADE_SUCCESS
						: result.successCount === 0
							? NotificationTypes.UPGRADE_FAILED
							: NotificationTypes.UPGRADE_PARTIAL;

				const title =
					result.failureCount === 0
						? hasDryRun
							? 'Upgrade Completed (Dry Run)'
							: 'Upgrade Completed'
						: result.successCount === 0
							? 'Upgrade Failed'
							: 'Upgrade Partially Completed';

				await notify(notificationType)
					.title(title)
					.lines(messageLines)
					.meta({
						successCount: result.successCount,
						failureCount: result.failureCount,
						dryRun: hasDryRun,
						instances: result.instances.filter((i) => i.success).map((i) => ({
							name: i.instanceName,
							filter: i.filterName,
							searched: i.itemsSearched,
							items: i.items
						}))
					})
					.send();
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

			await notify(NotificationTypes.UPGRADE_FAILED)
				.title('Upgrade Failed')
				.message(`Upgrade manager encountered an error: ${errorMessage}`)
				.meta({ error: errorMessage })
				.send();

			return {
				success: false,
				error: errorMessage
			};
		}
	}
};
