/**
 * Core logic for the upgrade manager job
 * Checks for upgrade configs that are due to run and processes them
 */

import { upgradeConfigsQueries } from '$db/queries/upgradeConfigs.ts';
import { arrInstancesQueries } from '$db/queries/arrInstances.ts';
import { logger } from '$logger/logger.ts';
import type { FilterConfig, UpgradeConfig } from '$lib/shared/filters';

export interface UpgradeInstanceStatus {
	instanceId: number;
	instanceName: string;
	success: boolean;
	filterName?: string;
	itemsSearched?: number;
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
 * Get the next filter to run based on the config's mode
 */
function getNextFilter(config: UpgradeConfig): FilterConfig | null {
	const enabledFilters = config.filters.filter((f) => f.enabled);

	if (enabledFilters.length === 0) {
		return null;
	}

	if (config.filterMode === 'random') {
		// Random: pick a random filter
		const randomIndex = Math.floor(Math.random() * enabledFilters.length);
		return enabledFilters[randomIndex];
	}

	// Round robin: use currentFilterIndex
	const index = config.currentFilterIndex % enabledFilters.length;
	return enabledFilters[index];
}

/**
 * Process a single upgrade config
 */
async function processUpgradeConfig(config: UpgradeConfig): Promise<UpgradeInstanceStatus> {
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

	// Get the filter to run
	const filter = getNextFilter(config);

	if (!filter) {
		return {
			instanceId: config.arrInstanceId,
			instanceName: instance.name,
			success: false,
			error: 'No enabled filters'
		};
	}

	await logger.info(`Processing upgrade for "${instance.name}" with filter "${filter.name}"`, {
		source: 'UpgradeManager',
		meta: {
			instanceId: instance.id,
			instanceType: instance.type,
			filterName: filter.name,
			selector: filter.selector,
			count: filter.count
		}
	});

	try {
		// TODO: Implement actual upgrade logic:
		// 1. Fetch library items from arr instance
		// 2. Apply filter rules to get matching items
		// 3. Apply selector to pick items (random, oldest, etc.)
		// 4. Check search cooldown (via arr tags)
		// 5. Trigger search for selected items
		// 6. Tag items with search timestamp

		await logger.debug('Upgrade config details', {
			source: 'UpgradeManager',
			meta: {
				instanceId: instance.id,
				filter: {
					id: filter.id,
					name: filter.name,
					cutoff: filter.cutoff,
					searchCooldown: filter.searchCooldown,
					selector: filter.selector,
					count: filter.count,
					rulesCount: filter.group.children.length
				}
			}
		});

		// Update filter index for round-robin mode
		if (config.filterMode === 'round_robin') {
			upgradeConfigsQueries.incrementFilterIndex(config.arrInstanceId);
		}

		// Update last run timestamp
		upgradeConfigsQueries.updateLastRun(config.arrInstanceId);

		return {
			instanceId: instance.id,
			instanceName: instance.name,
			success: true,
			filterName: filter.name,
			itemsSearched: 0 // TODO: Return actual count when implemented
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
			filterName: filter.name,
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

	await logger.info(`Found ${dueConfigs.length} upgrade config(s) to process`, {
		source: 'UpgradeManager',
		meta: {
			configIds: dueConfigs.map((c) => c.arrInstanceId)
		}
	});

	for (const config of dueConfigs) {
		const status = await processUpgradeConfig(config);
		statuses.push(status);

		if (status.success) {
			successCount++;
		} else if (status.error?.includes('disabled') || status.error?.includes('No enabled')) {
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
