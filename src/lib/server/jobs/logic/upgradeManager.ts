/**
 * Core logic for the upgrade manager job
 * Checks for upgrade configs that are due to run and processes them
 */

import { upgradeConfigsQueries } from '$db/queries/upgradeConfigs.ts';
import { arrInstancesQueries } from '$db/queries/arrInstances.ts';
import { logger } from '$logger/logger.ts';
import { processUpgradeConfig } from '$lib/server/upgrades/processor.ts';
import type { UpgradeConfig } from '$shared/upgrades/filters.ts';

export interface UpgradeInstanceStatus {
	instanceId: number;
	instanceName: string;
	success: boolean;
	filterName?: string;
	itemsSearched?: number;
	itemsRequested?: number;
	matchedCount?: number;
	afterCooldown?: number;
	items?: string[];
	dryRun?: boolean;
	error?: string;
}

export interface UpgradeManagerResult {
	totalProcessed: number;
	successCount: number;
	failureCount: number;
	skippedCount: number;
	instances: UpgradeInstanceStatus[];
}

/**
 * Process a single upgrade config and convert result to status
 */
async function processConfig(config: UpgradeConfig): Promise<UpgradeInstanceStatus> {
	const instance = arrInstancesQueries.getById(config.arrInstanceId);

	if (!instance) {
		return {
			instanceId: config.arrInstanceId,
			instanceName: 'Unknown',
			success: false,
			error: 'Arr instance not found'
		};
	}

	if (!instance.enabled) {
		return {
			instanceId: config.arrInstanceId,
			instanceName: instance.name,
			success: false,
			error: 'Arr instance is disabled'
		};
	}

	// Only process Radarr for now
	if (instance.type !== 'radarr') {
		return {
			instanceId: config.arrInstanceId,
			instanceName: instance.name,
			success: false,
			error: `Upgrade not yet supported for ${instance.type}`
		};
	}

	try {
		// Process using the upgrade processor
		const log = await processUpgradeConfig(config, instance);

		// Update filter index for round-robin mode after successful processing
		if (log.status !== 'failed' && config.filterMode === 'round_robin') {
			upgradeConfigsQueries.incrementFilterIndex(config.arrInstanceId);
		}

		// Update last run timestamp
		upgradeConfigsQueries.updateLastRun(config.arrInstanceId);

		// Convert log to status
		return {
			instanceId: instance.id,
			instanceName: instance.name,
			success: log.status === 'success' || log.status === 'partial',
			filterName: log.config.selectedFilter,
			itemsSearched: log.selection.actualCount,
			itemsRequested: log.selection.requestedCount,
			matchedCount: log.filter.matchedCount,
			afterCooldown: log.filter.afterCooldown,
			items: log.selection.items.map((i) => i.title),
			dryRun: config.dryRun,
			error: log.status === 'failed' ? log.results.errors.join('; ') : undefined
		};
	} catch (error) {
		await logger.error(`Failed to process upgrade for "${instance.name}"`, {
			source: 'UpgradeManager',
			meta: {
				instanceId: instance.id,
				error: error instanceof Error ? error.message : String(error)
			}
		});

		return {
			instanceId: instance.id,
			instanceName: instance.name,
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Run the upgrade manager
 * Checks for configs that are due and processes them
 */
export async function runUpgradeManager(): Promise<UpgradeManagerResult> {
	const dueConfigs = upgradeConfigsQueries.getDueConfigs();

	const totalProcessed = dueConfigs.length;
	let successCount = 0;
	let failureCount = 0;
	let skippedCount = 0;
	const statuses: UpgradeInstanceStatus[] = [];

	if (dueConfigs.length === 0) {
		await logger.debug('No upgrade configs due to run', {
			source: 'UpgradeManager'
		});

		return {
			totalProcessed: 0,
			successCount: 0,
			failureCount: 0,
			skippedCount: 0,
			instances: []
		};
	}

	await logger.debug(`Found ${dueConfigs.length} upgrade config(s) to process`, {
		source: 'UpgradeManager',
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
			status.error?.includes('not yet supported') ||
			status.error?.includes('No enabled')
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
