/**
 * Sync processor
 * Processes pending syncs by creating syncer instances and running them
 *
 * TODO: Trigger markForSync() from events:
 * - on_pull: Call arrSyncQueries.markForSync('on_pull') after database git pull completes
 * - on_change: Call arrSyncQueries.markForSync('on_change') after PCD files change
 * - schedule: Evaluate cron expressions and set should_sync when schedule matches
 */

import { arrSyncQueries } from '$db/queries/arrSync.ts';
import { arrInstancesQueries } from '$db/queries/arrInstances.ts';
import { createArrClient } from '$arr/factory.ts';
import type { ArrType } from '$arr/types.ts';
import { logger } from '$logger/logger.ts';
import { QualityProfileSyncer } from './qualityProfiles.ts';
import { DelayProfileSyncer } from './delayProfiles.ts';
import { MediaManagementSyncer } from './mediaManagement.ts';
import type { SyncResult } from './base.ts';

export interface ProcessSyncsResult {
	totalSynced: number;
	results: {
		instanceId: number;
		instanceName: string;
		qualityProfiles?: SyncResult;
		delayProfiles?: SyncResult;
		mediaManagement?: SyncResult;
	}[];
}

/**
 * Process all pending syncs
 * Called by the sync job and can be called manually
 */
export async function processPendingSyncs(): Promise<ProcessSyncsResult> {
	const pending = arrSyncQueries.getPendingSyncs();
	const results: ProcessSyncsResult['results'] = [];

	// Collect all unique instance IDs
	const instanceIds = new Set([
		...pending.qualityProfiles,
		...pending.delayProfiles,
		...pending.mediaManagement
	]);

	if (instanceIds.size === 0) {
		await logger.debug('No pending syncs', { source: 'SyncProcessor' });
		return { totalSynced: 0, results: [] };
	}

	await logger.info(`Processing syncs for ${instanceIds.size} instance(s)`, {
		source: 'SyncProcessor',
		meta: {
			qualityProfiles: pending.qualityProfiles.length,
			delayProfiles: pending.delayProfiles.length,
			mediaManagement: pending.mediaManagement.length
		}
	});

	let totalSynced = 0;

	for (const instanceId of instanceIds) {
		const instance = arrInstancesQueries.getById(instanceId);

		if (!instance) {
			await logger.warn(`Instance ${instanceId} not found, skipping sync`, {
				source: 'SyncProcessor'
			});
			continue;
		}

		if (!instance.enabled) {
			await logger.debug(`Instance "${instance.name}" is disabled, skipping sync`, {
				source: 'SyncProcessor'
			});
			continue;
		}

		const instanceResult: ProcessSyncsResult['results'][0] = {
			instanceId,
			instanceName: instance.name
		};

		try {
			// Create arr client for this instance
			const client = createArrClient(instance.type as ArrType, instance.url, instance.api_key);

			// Process quality profiles if pending
			if (pending.qualityProfiles.includes(instanceId)) {
				const syncer = new QualityProfileSyncer(client, instanceId, instance.name);
				instanceResult.qualityProfiles = await syncer.sync();
				totalSynced += instanceResult.qualityProfiles.itemsSynced;

				// Clear the should_sync flag
				arrSyncQueries.setQualityProfilesShouldSync(instanceId, false);
			}

			// Process delay profiles if pending
			if (pending.delayProfiles.includes(instanceId)) {
				const syncer = new DelayProfileSyncer(client, instanceId, instance.name);
				instanceResult.delayProfiles = await syncer.sync();
				totalSynced += instanceResult.delayProfiles.itemsSynced;

				// Clear the should_sync flag
				arrSyncQueries.setDelayProfilesShouldSync(instanceId, false);
			}

			// Process media management if pending
			if (pending.mediaManagement.includes(instanceId)) {
				const syncer = new MediaManagementSyncer(client, instanceId, instance.name);
				instanceResult.mediaManagement = await syncer.sync();
				totalSynced += instanceResult.mediaManagement.itemsSynced;

				// Clear the should_sync flag
				arrSyncQueries.setMediaManagementShouldSync(instanceId, false);
			}
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown error';
			await logger.error(`Failed to sync instance "${instance.name}"`, {
				source: 'SyncProcessor',
				meta: { instanceId, error: errorMsg }
			});
		}

		results.push(instanceResult);
	}

	await logger.info(`Sync processing complete`, {
		source: 'SyncProcessor',
		meta: { totalSynced, instanceCount: results.length }
	});

	return { totalSynced, results };
}

/**
 * Sync a specific instance manually
 * Syncs all configured sections regardless of should_sync flag
 */
export async function syncInstance(instanceId: number): Promise<ProcessSyncsResult['results'][0]> {
	const instance = arrInstancesQueries.getById(instanceId);

	if (!instance) {
		throw new Error(`Instance ${instanceId} not found`);
	}

	await logger.info(`Manual sync triggered for "${instance.name}"`, {
		source: 'SyncProcessor',
		meta: { instanceId }
	});

	const client = createArrClient(instance.type as ArrType, instance.url, instance.api_key);
	const result: ProcessSyncsResult['results'][0] = {
		instanceId,
		instanceName: instance.name
	};

	// Get sync configs to check what's enabled
	const qpConfig = arrSyncQueries.getQualityProfilesSync(instanceId);
	const dpConfig = arrSyncQueries.getDelayProfilesSync(instanceId);
	const mmConfig = arrSyncQueries.getMediaManagementSync(instanceId);

	// Sync quality profiles if configured
	if (qpConfig.config.trigger !== 'none' && qpConfig.selections.length > 0) {
		const syncer = new QualityProfileSyncer(client, instanceId, instance.name);
		result.qualityProfiles = await syncer.sync();
	}

	// Sync delay profiles if configured
	if (dpConfig.config.trigger !== 'none' && dpConfig.selections.length > 0) {
		const syncer = new DelayProfileSyncer(client, instanceId, instance.name);
		result.delayProfiles = await syncer.sync();
	}

	// Sync media management if configured
	if (
		mmConfig.trigger !== 'none' &&
		(mmConfig.namingDatabaseId || mmConfig.qualityDefinitionsDatabaseId || mmConfig.mediaSettingsDatabaseId)
	) {
		const syncer = new MediaManagementSyncer(client, instanceId, instance.name);
		result.mediaManagement = await syncer.sync();
	}

	return result;
}
