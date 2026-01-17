import { error, fail } from '@sveltejs/kit';
import type { Actions, ServerLoad } from '@sveltejs/kit';
import { arrInstancesQueries } from '$db/queries/arrInstances.ts';
import { arrRenameSettingsQueries } from '$db/queries/arrRenameSettings.ts';
import { logger } from '$logger/logger.ts';
import { processRenameConfig } from '$lib/server/rename/processor.ts';

export const load: ServerLoad = ({ params }) => {
	const id = parseInt(params.id || '', 10);

	if (isNaN(id)) {
		error(404, `Invalid instance ID: ${params.id}`);
	}

	const instance = arrInstancesQueries.getById(id);

	if (!instance) {
		error(404, `Instance not found: ${id}`);
	}

	const settings = arrRenameSettingsQueries.getByInstanceId(id);

	return {
		instance,
		settings: settings ?? null
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
			const renameFolders = formData.get('renameFolders') === 'true';
			const ignoreTag = (formData.get('ignoreTag') as string) || null;
			const schedule = parseInt(formData.get('schedule') as string, 10) || 1440;

			const settingsData = {
				enabled,
				dryRun,
				renameFolders,
				ignoreTag,
				schedule
			};

			arrRenameSettingsQueries.upsert(id, settingsData);

			await logger.info(`Rename settings saved for instance "${instance.name}"`, {
				source: 'rename',
				meta: { instanceId: id, instanceName: instance.name }
			});

			await logger.debug('Rename settings details', {
				source: 'rename',
				meta: {
					instanceId: id,
					...settingsData
				}
			});

			return { success: true };
		} catch (err) {
			await logger.error('Failed to save rename settings', {
				source: 'rename',
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

		const existing = arrRenameSettingsQueries.getByInstanceId(id);
		if (!existing) {
			return fail(404, { error: 'Configuration not found' });
		}

		const formData = await request.formData();

		try {
			const enabled = formData.get('enabled') === 'true';
			const dryRun = formData.get('dryRun') === 'true';
			const renameFolders = formData.get('renameFolders') === 'true';
			const ignoreTag = (formData.get('ignoreTag') as string) || null;
			const schedule = parseInt(formData.get('schedule') as string, 10) || 1440;

			const settingsData = {
				enabled,
				dryRun,
				renameFolders,
				ignoreTag,
				schedule
			};

			arrRenameSettingsQueries.update(id, settingsData);

			await logger.info(`Rename settings updated for instance "${instance.name}"`, {
				source: 'rename',
				meta: { instanceId: id, instanceName: instance.name }
			});

			await logger.debug('Rename settings details', {
				source: 'rename',
				meta: {
					instanceId: id,
					...settingsData
				}
			});

			return { success: true };
		} catch (err) {
			await logger.error('Failed to update rename settings', {
				source: 'rename',
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

		const settings = arrRenameSettingsQueries.getByInstanceId(id);
		if (!settings) {
			return fail(404, { error: 'No rename configuration found. Save a configuration first.' });
		}

		// Only support Radarr and Sonarr
		if (instance.type !== 'radarr' && instance.type !== 'sonarr') {
			return fail(400, { error: `Rename not yet supported for ${instance.type}` });
		}

		try {
			const result = await processRenameConfig(settings, instance, true);

			// Update last run timestamp
			arrRenameSettingsQueries.updateLastRun(id);

			return {
				success: true,
				runResult: {
					status: result.status,
					dryRun: result.config.dryRun,
					filesNeedingRename: result.results.filesNeedingRename,
					filesRenamed: result.results.filesRenamed,
					foldersRenamed: result.results.foldersRenamed,
					items: result.renamedItems
				}
			};
		} catch (err) {
			await logger.error('Manual rename run failed', {
				source: 'rename',
				meta: { instanceId: id, error: err }
			});

			return fail(500, { error: 'Rename run failed. Check logs for details.' });
		}
	}
};
