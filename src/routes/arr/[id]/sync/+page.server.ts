import { error, fail } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import { arrInstancesQueries } from '$db/queries/arrInstances.ts';
import { arrSyncQueries, type SyncTrigger, type ProfileSelection } from '$db/queries/arrSync.ts';
import { pcdManager } from '$pcd/pcd.ts';
import { logger } from '$logger/logger.ts';
import * as qualityProfileQueries from '$pcd/queries/qualityProfiles/index.ts';
import * as delayProfileQueries from '$pcd/queries/delayProfiles/index.ts';
import { calculateNextRun } from '$lib/server/sync/cron.ts';

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

	// Fetch profiles from each database
	const databasesWithProfiles = await Promise.all(
		databases.map(async (db) => {
			const cache = pcdManager.getCache(db.id);
			if (!cache) {
				return {
					id: db.id,
					name: db.name,
					qualityProfiles: [],
					delayProfiles: []
				};
			}

			const [qualityProfiles, delayProfiles] = await Promise.all([
				qualityProfileQueries.list(cache),
				delayProfileQueries.list(cache)
			]);

			return {
				id: db.id,
				name: db.name,
				qualityProfiles,
				delayProfiles
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
		const selectionsJson = formData.get('selections') as string;
		const trigger = formData.get('trigger') as SyncTrigger;
		const cron = formData.get('cron') as string | null;

		try {
			const selections: ProfileSelection[] = JSON.parse(selectionsJson || '[]');
			const effectiveTrigger = trigger || 'manual';
			const effectiveCron = cron || null;
			arrSyncQueries.saveDelayProfilesSync(id, selections, {
				trigger: effectiveTrigger,
				cron: effectiveCron,
				nextRunAt: effectiveTrigger === 'schedule' ? calculateNextRun(effectiveCron) : null
			});

			await logger.info(`Delay profiles sync config saved for "${instance?.name}"`, {
				source: 'sync',
				meta: { instanceId: id, profileCount: selections.length, trigger }
			});

			return { success: true };
		} catch (e) {
			await logger.error('Failed to save delay profiles sync config', {
				source: 'sync',
				meta: { instanceId: id, error: e }
			});
			return fail(500, { error: 'Failed to save delay profiles sync config' });
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
		const qualityDefinitionsDatabaseId = formData.get('qualityDefinitionsDatabaseId') as string | null;
		const mediaSettingsDatabaseId = formData.get('mediaSettingsDatabaseId') as string | null;
		const trigger = formData.get('trigger') as SyncTrigger;
		const cron = formData.get('cron') as string | null;

		try {
			const effectiveTrigger = trigger || 'manual';
			const effectiveCron = cron || null;
			arrSyncQueries.saveMediaManagementSync(id, {
				namingDatabaseId: namingDatabaseId ? parseInt(namingDatabaseId, 10) : null,
				qualityDefinitionsDatabaseId: qualityDefinitionsDatabaseId ? parseInt(qualityDefinitionsDatabaseId, 10) : null,
				mediaSettingsDatabaseId: mediaSettingsDatabaseId ? parseInt(mediaSettingsDatabaseId, 10) : null,
				trigger: effectiveTrigger,
				cron: effectiveCron,
				nextRunAt: effectiveTrigger === 'schedule' ? calculateNextRun(effectiveCron) : null
			});

			await logger.info(`Media management sync config saved for "${instance?.name}"`, {
				source: 'sync',
				meta: { instanceId: id, trigger }
			});

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
			const { DelayProfileSyncer } = await import('$lib/server/sync/delayProfiles.ts');
			const client = createArrClient(instance.type as 'radarr' | 'sonarr', instance.url, instance.api_key);
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
			const { QualityProfileSyncer } = await import('$lib/server/sync/qualityProfiles.ts');
			const client = createArrClient(instance.type as 'radarr' | 'sonarr', instance.url, instance.api_key);
			const syncer = new QualityProfileSyncer(client, id, instance.name, instance.type as 'radarr' | 'sonarr');
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
			const { MediaManagementSyncer } = await import('$lib/server/sync/mediaManagement.ts');
			const client = createArrClient(instance.type as 'radarr' | 'sonarr', instance.url, instance.api_key);
			const syncer = new MediaManagementSyncer(client, id, instance.name, instance.type as 'radarr' | 'sonarr');
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
