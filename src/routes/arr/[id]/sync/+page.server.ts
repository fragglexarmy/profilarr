import { error, fail } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import { arrInstancesQueries } from '$db/queries/arrInstances.ts';
import { arrSyncQueries, type SyncTrigger, type ProfileSelection } from '$db/queries/arrSync.ts';
import { pcdManager } from '$pcd/index.ts';
import { logger } from '$logger/logger.ts';
import * as qualityProfileQueries from '$pcd/entities/qualityProfiles/index.ts';
import * as delayProfileQueries from '$pcd/entities/delayProfiles/index.ts';
import * as namingQueries from '$pcd/entities/mediaManagement/naming/index.ts';
import * as qualityDefinitionsQueries from '$pcd/entities/mediaManagement/quality-definitions/index.ts';
import * as mediaSettingsQueries from '$pcd/entities/mediaManagement/media-settings/index.ts';
import { calculateNextRun } from '$lib/server/sync/utils.ts';
import { updateSyncArrJobEnabled } from '$lib/server/jobs/init.ts';

export const load: ServerLoad = async ({ params }) => {
	const id = parseInt(params.id || '', 10);

	if (isNaN(id)) {
		error(404, `Invalid instance ID: ${params.id}`);
	}

	const instance = arrInstancesQueries.getById(id);

	if (!instance) {
		error(404, `Instance not found: ${id}`);
	}

	// Get all databases
	const databases = pcdManager.getAll();
	const arrType = instance.type as 'radarr' | 'sonarr';

	// Fetch profiles and configs from each database
	const databasesWithProfiles = await Promise.all(
		databases.map(async (db) => {
			const cache = pcdManager.getCache(db.id);
			if (!cache) {
				return {
					id: db.id,
					name: db.name,
					qualityProfiles: [],
					delayProfiles: [],
					namingConfigs: [],
					qualityDefinitionsConfigs: [],
					mediaSettingsConfigs: []
				};
			}

			const [qualityProfiles, delayProfiles, allNamingConfigs, allQualityDefinitionsConfigs, allMediaSettingsConfigs] = await Promise.all([
				qualityProfileQueries.list(cache),
				delayProfileQueries.list(cache),
				namingQueries.list(cache),
				qualityDefinitionsQueries.list(cache),
				mediaSettingsQueries.list(cache)
			]);

			// Filter configs by arr type - only show configs for the instance's arr type
			const namingConfigs = allNamingConfigs
				.filter(c => c.arr_type === arrType)
				.map(c => ({ name: c.name }));
			const qualityDefinitionsConfigs = allQualityDefinitionsConfigs
				.filter(c => c.arr_type === arrType)
				.map(c => ({ name: c.name }));
			const mediaSettingsConfigs = allMediaSettingsConfigs
				.filter(c => c.arr_type === arrType)
				.map(c => ({ name: c.name }));

			return {
				id: db.id,
				name: db.name,
				qualityProfiles,
				delayProfiles,
				namingConfigs,
				qualityDefinitionsConfigs,
				mediaSettingsConfigs
			};
		})
	);

	// Load existing sync data
	const syncData = arrSyncQueries.getFullSyncData(id);

	return {
		instance,
		databases: databasesWithProfiles,
		syncData
	};
};

export const actions: Actions = {
	saveQualityProfiles: async ({ params, request }) => {
		const id = parseInt(params.id || '', 10);
		if (isNaN(id)) {
			return fail(400, { error: 'Invalid instance ID' });
		}

		const instance = arrInstancesQueries.getById(id);
		const formData = await request.formData();
		const selectionsJson = formData.get('selections') as string;
		const trigger = formData.get('trigger') as SyncTrigger;
		const cron = formData.get('cron') as string | null;

		try {
			const selections: ProfileSelection[] = JSON.parse(selectionsJson || '[]');
			const effectiveTrigger = trigger || 'manual';
			const effectiveCron = cron || null;
			arrSyncQueries.saveQualityProfilesSync(id, selections, {
				trigger: effectiveTrigger,
				cron: effectiveCron,
				nextRunAt: effectiveTrigger === 'schedule' ? calculateNextRun(effectiveCron) : null
			});

			await logger.info(`Quality profiles sync config saved for "${instance?.name}"`, {
				source: 'sync',
				meta: { instanceId: id, profileCount: selections.length, trigger }
			});

			// Update sync_arr job enabled state based on whether any scheduled configs exist
			await updateSyncArrJobEnabled();

			return { success: true };
		} catch (e) {
			await logger.error('Failed to save quality profiles sync config', {
				source: 'sync',
				meta: { instanceId: id, error: e }
			});
			return fail(500, { error: 'Failed to save quality profiles sync config' });
		}
	},

	saveDelayProfiles: async ({ params, request }) => {
		const id = parseInt(params.id || '', 10);
		if (isNaN(id)) {
			return fail(400, { error: 'Invalid instance ID' });
		}

		const instance = arrInstancesQueries.getById(id);
		const formData = await request.formData();
		const databaseId = formData.get('databaseId') as string | null;
		const profileName = formData.get('profileName') as string | null;
		const trigger = formData.get('trigger') as SyncTrigger;
		const cron = formData.get('cron') as string | null;

		try {
			const effectiveTrigger = trigger || 'manual';
			const effectiveCron = cron || null;
			arrSyncQueries.saveDelayProfilesSync(id, {
				databaseId: databaseId ? parseInt(databaseId, 10) : null,
				profileName: profileName || null,
				trigger: effectiveTrigger,
				cron: effectiveCron,
				nextRunAt: effectiveTrigger === 'schedule' ? calculateNextRun(effectiveCron) : null
			});

			await logger.info(`Delay profile sync config saved for "${instance?.name}"`, {
				source: 'sync',
				meta: { instanceId: id, databaseId, profileName, trigger }
			});

			// Update sync_arr job enabled state based on whether any scheduled configs exist
			await updateSyncArrJobEnabled();

			return { success: true };
		} catch (e) {
			await logger.error('Failed to save delay profile sync config', {
				source: 'sync',
				meta: { instanceId: id, error: e }
			});
			return fail(500, { error: 'Failed to save delay profile sync config' });
		}
	},

	saveMediaManagement: async ({ params, request }) => {
		const id = parseInt(params.id || '', 10);
		if (isNaN(id)) {
			return fail(400, { error: 'Invalid instance ID' });
		}

		const instance = arrInstancesQueries.getById(id);
		const formData = await request.formData();
		const namingDatabaseId = formData.get('namingDatabaseId') as string | null;
		const namingConfigName = formData.get('namingConfigName') as string | null;
		const qualityDefinitionsDatabaseId = formData.get('qualityDefinitionsDatabaseId') as
			| string
			| null;
		const qualityDefinitionsConfigName = formData.get('qualityDefinitionsConfigName') as string | null;
		const mediaSettingsDatabaseId = formData.get('mediaSettingsDatabaseId') as string | null;
		const mediaSettingsConfigName = formData.get('mediaSettingsConfigName') as string | null;
		const trigger = formData.get('trigger') as SyncTrigger;
		const cron = formData.get('cron') as string | null;

		try {
			const effectiveTrigger = trigger || 'manual';
			const effectiveCron = cron || null;
			arrSyncQueries.saveMediaManagementSync(id, {
				namingDatabaseId: namingDatabaseId ? parseInt(namingDatabaseId, 10) : null,
				namingConfigName: namingConfigName || null,
				qualityDefinitionsDatabaseId: qualityDefinitionsDatabaseId
					? parseInt(qualityDefinitionsDatabaseId, 10)
					: null,
				qualityDefinitionsConfigName: qualityDefinitionsConfigName || null,
				mediaSettingsDatabaseId: mediaSettingsDatabaseId
					? parseInt(mediaSettingsDatabaseId, 10)
					: null,
				mediaSettingsConfigName: mediaSettingsConfigName || null,
				trigger: effectiveTrigger,
				cron: effectiveCron,
				nextRunAt: effectiveTrigger === 'schedule' ? calculateNextRun(effectiveCron) : null
			});

			await logger.info(`Media management sync config saved for "${instance?.name}"`, {
				source: 'sync',
				meta: { instanceId: id, trigger }
			});

			// Update sync_arr job enabled state based on whether any scheduled configs exist
			await updateSyncArrJobEnabled();

			return { success: true };
		} catch (e) {
			await logger.error('Failed to save media management sync config', {
				source: 'sync',
				meta: { instanceId: id, error: e }
			});
			return fail(500, { error: 'Failed to save media management sync config' });
		}
	},

	syncDelayProfiles: async ({ params }) => {
		const id = parseInt(params.id || '', 10);
		if (isNaN(id)) {
			return fail(400, { error: 'Invalid instance ID' });
		}

		const instance = arrInstancesQueries.getById(id);
		if (!instance) {
			return fail(404, { error: 'Instance not found' });
		}

		try {
			const { createArrClient } = await import('$arr/factory.ts');
			const { DelayProfileSyncer } = await import('$lib/server/sync');
			const client = createArrClient(
				instance.type as 'radarr' | 'sonarr',
				instance.url,
				instance.api_key
			);
			const syncer = new DelayProfileSyncer(client, id, instance.name);
			const result = await syncer.sync();

			await logger.info(`Manual delay profiles sync completed for "${instance.name}"`, {
				source: 'sync',
				meta: { instanceId: id, result }
			});

			return { success: true, result };
		} catch (e) {
			const errorMsg = e instanceof Error ? e.message : 'Unknown error';
			await logger.error(`Manual delay profiles sync failed for "${instance.name}"`, {
				source: 'sync',
				meta: { instanceId: id, error: errorMsg }
			});
			return fail(500, { error: `Sync failed: ${errorMsg}` });
		}
	},

	syncQualityProfiles: async ({ params }) => {
		const id = parseInt(params.id || '', 10);
		if (isNaN(id)) {
			return fail(400, { error: 'Invalid instance ID' });
		}

		const instance = arrInstancesQueries.getById(id);
		if (!instance) {
			return fail(404, { error: 'Instance not found' });
		}

		try {
			const { createArrClient } = await import('$arr/factory.ts');
			const { QualityProfileSyncer } = await import('$lib/server/sync');
			const client = createArrClient(
				instance.type as 'radarr' | 'sonarr',
				instance.url,
				instance.api_key
			);
			const syncer = new QualityProfileSyncer(
				client,
				id,
				instance.name,
				instance.type as 'radarr' | 'sonarr'
			);
			const result = await syncer.sync();

			await logger.info(`Manual quality profiles sync completed for "${instance.name}"`, {
				source: 'sync',
				meta: { instanceId: id, result }
			});

			return { success: true, result };
		} catch (e) {
			const errorMsg = e instanceof Error ? e.message : 'Unknown error';
			await logger.error(`Manual quality profiles sync failed for "${instance.name}"`, {
				source: 'sync',
				meta: { instanceId: id, error: errorMsg }
			});
			return fail(500, { error: `Sync failed: ${errorMsg}` });
		}
	},

	syncMediaManagement: async ({ params }) => {
		const id = parseInt(params.id || '', 10);
		if (isNaN(id)) {
			return fail(400, { error: 'Invalid instance ID' });
		}

		const instance = arrInstancesQueries.getById(id);
		if (!instance) {
			return fail(404, { error: 'Instance not found' });
		}

		try {
			const { createArrClient } = await import('$arr/factory.ts');
			const { MediaManagementSyncer } = await import('$lib/server/sync');
			const client = createArrClient(
				instance.type as 'radarr' | 'sonarr',
				instance.url,
				instance.api_key
			);
			const syncer = new MediaManagementSyncer(
				client,
				id,
				instance.name,
				instance.type as 'radarr' | 'sonarr'
			);
			const result = await syncer.sync();

			await logger.info(`Manual media management sync completed for "${instance.name}"`, {
				source: 'sync',
				meta: { instanceId: id, result }
			});

			return { success: true, result };
		} catch (e) {
			const errorMsg = e instanceof Error ? e.message : 'Unknown error';
			await logger.error(`Manual media management sync failed for "${instance.name}"`, {
				source: 'sync',
				meta: { instanceId: id, error: errorMsg }
			});
			return fail(500, { error: `Sync failed: ${errorMsg}` });
		}
	}
};
