import { error, fail } from '@sveltejs/kit';
import type { Actions, ServerLoad } from '@sveltejs/kit';
import { arrInstancesQueries } from '$db/queries/arrInstances.ts';
import { upgradeConfigsQueries } from '$db/queries/upgradeConfigs.ts';
import { logger } from '$logger/logger.ts';
import { notify } from '$notifications/builder.ts';
import { NotificationTypes } from '$notifications/types.ts';
import type { FilterConfig, FilterMode } from '$lib/shared/filters.ts';
import { processUpgradeConfig } from '$lib/server/upgrades/processor.ts';

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

	return {
		instance,
		config: config ?? null
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
						cutoff: f.cutoff,
						searchCooldown: f.searchCooldown
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

	update: async ({ params, request }) => {
		const id = parseInt(params.id || '', 10);

		if (isNaN(id)) {
			return fail(400, { error: 'Invalid instance ID' });
		}

		const instance = arrInstancesQueries.getById(id);
		if (!instance) {
			return fail(404, { error: 'Instance not found' });
		}

		const existing = upgradeConfigsQueries.getByArrInstanceId(id);
		if (!existing) {
			return fail(404, { error: 'Configuration not found' });
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

			upgradeConfigsQueries.update(id, configData);

			await logger.info(`Upgrade config updated for instance "${instance.name}"`, {
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
						cutoff: f.cutoff,
						searchCooldown: f.searchCooldown
					}))
				}
			});

			return { success: true };
		} catch (err) {
			await logger.error('Failed to update upgrade config', {
				source: 'upgrades',
				meta: { instanceId: id, error: err }
			});
			return fail(500, { error: 'Failed to update configuration' });
		}
	},

	run: async ({ params }) => {
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

		// Only allow manual runs in dry run mode
		if (!config.dryRun) {
			return fail(400, { error: 'Manual runs only allowed in Dry Run mode. Enable Dry Run first.' });
		}

		try {
			await logger.info(`Manual upgrade run triggered for "${instance.name}"`, {
				source: 'upgrades',
				meta: { instanceId: id, dryRun: config.dryRun }
			});

			const result = await processUpgradeConfig(config, instance);

			// Update last run timestamp
			upgradeConfigsQueries.updateLastRun(id);

			// Update filter index for round-robin mode
			if (result.status !== 'failed' && config.filterMode === 'round_robin') {
				upgradeConfigsQueries.incrementFilterIndex(id);
			}

			// Send notification
			const isSuccess = result.status === 'success' || result.status === 'partial';
			const dryRunLabel = result.config.dryRun ? ' [DRY RUN]' : '';
			const itemsList = result.selection.items.map((i) => i.title).join(', ');

			await notify(isSuccess ? NotificationTypes.UPGRADE_SUCCESS : NotificationTypes.UPGRADE_FAILED)
				.title(`${instance.name}: ${result.config.selectedFilter}${dryRunLabel}`)
				.lines([
					`Filter: ${result.filter.matchedCount} matched → ${result.filter.afterCooldown} after cooldown`,
					`Selection: ${result.selection.actualCount}/${result.selection.requestedCount} items`,
					`Results: ${result.results.searchesTriggered} searches, ${result.results.successful} successful`,
					itemsList ? `Items: ${itemsList}` : null
				])
				.meta({
					instanceId: id,
					instanceName: instance.name,
					filterName: result.config.selectedFilter,
					itemsSearched: result.selection.actualCount,
					matchedCount: result.filter.matchedCount,
					dryRun: result.config.dryRun,
					items: result.selection.items.map((i) => i.title)
				})
				.send();

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
			const errorMessage = err instanceof Error ? err.message : 'Unknown error';

			await logger.error('Manual upgrade run failed', {
				source: 'upgrades',
				meta: { instanceId: id, error: err }
			});

			await notify(NotificationTypes.UPGRADE_FAILED)
				.title('Upgrade Failed')
				.message(`${instance.name}: ${errorMessage}`)
				.meta({ instanceId: id, instanceName: instance.name, error: errorMessage, dryRun: true })
				.send();

			return fail(500, { error: 'Upgrade run failed. Check logs for details.' });
		}
	}
};
