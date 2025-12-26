import { error, fail } from '@sveltejs/kit';
import type { Actions, ServerLoad } from '@sveltejs/kit';
import { arrInstancesQueries } from '$db/queries/arrInstances.ts';
import { upgradeConfigsQueries } from '$db/queries/upgradeConfigs.ts';
import { logger } from '$logger/logger.ts';
import type { FilterConfig, FilterMode } from '$lib/shared/filters';

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
			const schedule = parseInt(formData.get('schedule') as string, 10) || 360;
			const filterMode = (formData.get('filterMode') as FilterMode) || 'round_robin';
			const filtersJson = formData.get('filters') as string;
			const filters: FilterConfig[] = filtersJson ? JSON.parse(filtersJson) : [];

			const configData = {
				enabled,
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
					schedule,
					filterMode,
					filterCount: filters.length,
					filters: filters.map((f) => ({
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
			const schedule = parseInt(formData.get('schedule') as string, 10) || 360;
			const filterMode = (formData.get('filterMode') as FilterMode) || 'round_robin';
			const filtersJson = formData.get('filters') as string;
			const filters: FilterConfig[] = filtersJson ? JSON.parse(filtersJson) : [];

			const configData = {
				enabled,
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
					schedule,
					filterMode,
					filterCount: filters.length,
					filters: filters.map((f) => ({
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
	}
};
