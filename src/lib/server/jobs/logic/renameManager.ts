/**
 * Core logic for the rename manager job
 * Checks for rename configs that are due to run and processes them
 */

import { arrRenameSettingsQueries } from '$db/queries/arrRenameSettings.ts';
import { arrInstancesQueries } from '$db/queries/arrInstances.ts';
import { logger } from '$logger/logger.ts';
import { processRenameConfig } from '$lib/server/rename/processor.ts';
import type { RenameSettings } from '$db/queries/arrRenameSettings.ts';

export interface RenameInstanceStatus {
	instanceId: number;
	instanceName: string;
	instanceType: string;
	success: boolean;
	filesRenamed?: number;
	filesNeedingRename?: number;
	foldersRenamed?: number;
	skippedByTag?: number;
	dryRun?: boolean;
	items?: {
		title: string;
		files: { existingPath: string; newPath: string }[];
	}[];
	error?: string;
}

export interface RenameManagerResult {
	totalProcessed: number;
	successCount: number;
	failureCount: number;
	skippedCount: number;
	instances: RenameInstanceStatus[];
}

/**
 * Process a single rename config and convert result to status
 */
async function processConfig(settings: RenameSettings): Promise<RenameInstanceStatus> {
	const instance = arrInstancesQueries.getById(settings.arrInstanceId);

	if (!instance) {
		return {
			instanceId: settings.arrInstanceId,
			instanceName: 'Unknown',
			instanceType: 'unknown',
			success: false,
			error: 'Arr instance not found'
		};
	}

	if (!instance.enabled) {
		return {
			instanceId: settings.arrInstanceId,
			instanceName: instance.name,
			instanceType: instance.type,
			success: false,
			error: 'Arr instance is disabled'
		};
	}

	// Only process Radarr and Sonarr
	if (instance.type !== 'radarr' && instance.type !== 'sonarr') {
		return {
			instanceId: settings.arrInstanceId,
			instanceName: instance.name,
			instanceType: instance.type,
			success: false,
			error: `Rename not yet supported for ${instance.type}`
		};
	}

	try {
		// Process using the rename processor
		const log = await processRenameConfig(settings, instance);

		// Update last run timestamp
		arrRenameSettingsQueries.updateLastRun(settings.arrInstanceId);

		// Convert log to status
		return {
			instanceId: instance.id,
			instanceName: instance.name,
			instanceType: instance.type,
			success: log.status === 'success' || log.status === 'partial',
			filesRenamed: log.results.filesRenamed,
			filesNeedingRename: log.results.filesNeedingRename,
			foldersRenamed: log.results.foldersRenamed,
			skippedByTag: log.filtering.skippedByTag,
			dryRun: settings.dryRun,
			items: log.renamedItems.map((i) => ({ title: i.title, files: i.files })),
			error: log.status === 'failed' ? log.results.errors.join('; ') : undefined
		};
	} catch (error) {
		await logger.error(`Failed to process rename for "${instance.name}"`, {
			source: 'RenameManager',
			meta: {
				instanceId: instance.id,
				error: error instanceof Error ? error.message : String(error)
			}
		});

		return {
			instanceId: instance.id,
			instanceName: instance.name,
			instanceType: instance.type,
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Run the rename manager
 * Checks for configs that are due and processes them
 */
export async function runRenameManager(): Promise<RenameManagerResult> {
	const dueConfigs = arrRenameSettingsQueries.getDueConfigs();

	const totalProcessed = dueConfigs.length;
	let successCount = 0;
	let failureCount = 0;
	let skippedCount = 0;
	const statuses: RenameInstanceStatus[] = [];

	if (dueConfigs.length === 0) {
		await logger.debug('No rename configs due to run', {
			source: 'RenameManager'
		});

		return {
			totalProcessed: 0,
			successCount: 0,
			failureCount: 0,
			skippedCount: 0,
			instances: []
		};
	}

	await logger.debug(`Found ${dueConfigs.length} rename config(s) to process`, {
		source: 'RenameManager',
		meta: {
			configIds: dueConfigs.map((c) => c.arrInstanceId)
		}
	});

	for (const config of dueConfigs) {
		const status = await processConfig(config);
		statuses.push(status);

		if (status.success) {
			successCount++;
		} else if (
			status.error?.includes('disabled') ||
			status.error?.includes('not yet supported')
		) {
			skippedCount++;
		} else {
			failureCount++;
		}
	}

	return {
		totalProcessed,
		successCount,
		failureCount,
		skippedCount,
		instances: statuses
	};
}
