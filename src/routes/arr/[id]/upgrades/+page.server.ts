import { error, fail } from '@sveltejs/kit';
import type { Actions, ServerLoad } from '@sveltejs/kit';
import { arrInstancesQueries } from '$db/queries/arrInstances.ts';
import { upgradeConfigsQueries } from '$db/queries/upgradeConfigs.ts';
import { upgradeRunsQueries } from '$db/queries/upgradeRuns.ts';
import { logger } from '$logger/logger.ts';
import type { FilterConfig, FilterMode } from '$lib/shared/filters.ts';
import { processUpgradeConfig, clearDryRunExclusions } from '$lib/server/upgrades/processor.ts';
import { logDryRunCacheCleared } from '$lib/server/upgrades/logger.ts';

export const load: ServerLoad = ({ params }) => {
	const id = parseInt(params.id || '', 10);

	if (isNaN(id)) {
		error(404, `Invalid instance ID: ${params.id}`);
	}

	const instance = arrInstancesQueries.getById(id);

	if (!instance) {
		error(404, `Instance not found: ${id}`);
	}

	const config = upgradeConfigsQueries.getByArrInstanceId(id);

	// Load upgrade runs from database
	const upgradeRuns = upgradeRunsQueries.getByInstanceId(id);

	return {
		instance,
		config: config ?? null,
		upgradeRuns
	};
};

export const actions: Actions = {
	save: async ({ params, request }) => {
		const id = parseInt(params.id || '', 10);

		if (isNaN(id)) {
			return fail(400, { error: 'Invalid instance ID' });
		}

		const instance = arrInstancesQueries.getById(id);
		if (!instance) {
			return fail(404, { error: 'Instance not found' });
		}

		const formData = await request.formData();

		try {
			const enabled = formData.get('enabled') === 'true';
			const dryRun = formData.get('dryRun') === 'true';
			const schedule = parseInt(formData.get('schedule') as string, 10) || 360;
			const filterMode = (formData.get('filterMode') as FilterMode) || 'round_robin';
			const filtersJson = formData.get('filters') as string;
			const filters: FilterConfig[] = filtersJson ? JSON.parse(filtersJson) : [];

			const configData = {
				enabled,
				dryRun,
				schedule,
				filterMode,
				filters
			};

			upgradeConfigsQueries.upsert(id, configData);

			await logger.info(`Upgrade config saved for instance "${instance.name}"`, {
				source: 'upgrades',
				meta: { instanceId: id, instanceName: instance.name }
			});

			await logger.debug('Upgrade config details', {
				source: 'upgrades',
				meta: {
					instanceId: id,
					enabled,
					dryRun,
					schedule,
					filterMode,
					filterCount: filters.length,
					filters: filters.map((f: FilterConfig) => ({
						id: f.id,
						name: f.name,
						enabled: f.enabled,
						selector: f.selector,
						count: f.count,
						cutoff: f.cutoff
					}))
				}
			});

			// Full filter rules for debugging
			await logger.debug('Filter rules', {
				source: 'upgrades',
				meta: {
					filters: filters.map((f: FilterConfig) => ({
						name: f.name,
						rules: f.group
					}))
				}
			});

			return { success: true };
		} catch (err) {
			await logger.error('Failed to save upgrade config', {
				source: 'upgrades',
				meta: { instanceId: id, error: err }
			});
			return fail(500, { error: 'Failed to save configuration' });
		}
	},

	run: async ({ params, request }) => {
		const id = parseInt(params.id || '', 10);

		if (isNaN(id)) {
			return fail(400, { error: 'Invalid instance ID' });
		}

		const instance = arrInstancesQueries.getById(id);
		if (!instance) {
			return fail(404, { error: 'Instance not found' });
		}

		const config = upgradeConfigsQueries.getByArrInstanceId(id);
		if (!config) {
			return fail(404, { error: 'No upgrade configuration found. Save a configuration first.' });
		}

		if (config.filters.length === 0) {
			return fail(400, { error: 'No filters configured. Add at least one filter.' });
		}

		const enabledFilters = config.filters.filter((f: FilterConfig) => f.enabled);
		if (enabledFilters.length === 0) {
			return fail(400, { error: 'No enabled filters. Enable at least one filter.' });
		}

		// Only support Radarr for now
		if (instance.type !== 'radarr') {
			return fail(400, { error: `Upgrade not yet supported for ${instance.type}` });
		}

		// Check for dev mode - in dev mode, allow manual runs even without dry run
		const isDev = import.meta.env.VITE_CHANNEL === 'dev';

		// Only allow manual runs in dry run mode (or dev mode)
		if (!config.dryRun && !isDev) {
			return fail(400, {
				error: 'Manual runs only allowed in Dry Run mode. Enable Dry Run first.'
			});
		}

		try {
			await logger.debug(`Manual upgrade run triggered for "${instance.name}"`, {
				source: 'upgrades',
				meta: { instanceId: id, dryRun: config.dryRun, isDev }
			});

			const result = await processUpgradeConfig(config, instance, true);

			// Update last run timestamp
			upgradeConfigsQueries.updateLastRun(id);

			// Update filter index for round-robin mode
			if (result.status !== 'failed' && config.filterMode === 'round_robin') {
				upgradeConfigsQueries.incrementFilterIndex(id);
			}

			return {
				success: true,
				runResult: {
					status: result.status,
					filterName: result.config.selectedFilter,
					dryRun: result.config.dryRun,
					matched: result.filter.matchedCount,
					afterCooldown: result.filter.afterCooldown,
					searched: result.selection.actualCount,
					items: result.selection.items
				}
			};
		} catch (err) {
			await logger.error('Manual upgrade run failed', {
				source: 'upgrades',
				meta: { instanceId: id, error: err }
			});

			return fail(500, { error: 'Upgrade run failed. Check logs for details.' });
		}
	},

	clearCache: async ({ params }) => {
		const id = parseInt(params.id || '', 10);

		if (isNaN(id)) {
			return fail(400, { error: 'Invalid instance ID' });
		}

		const instance = arrInstancesQueries.getById(id);
		const instanceName = instance?.name ?? `Instance ${id}`;

		const clearedIds = clearDryRunExclusions(id);
		await logDryRunCacheCleared(id, instanceName, clearedIds);

		return { success: true, cacheCleared: true };
	}
};
