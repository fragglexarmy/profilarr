import { error, fail } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import { arrInstancesQueries } from '$db/queries/arrInstances.ts';
import { arrSyncQueries, type SyncTrigger, type ProfileSelection } from '$db/queries/arrSync.ts';
import { pcdManager } from '$pcd/pcd.ts';
import { logger } from '$logger/logger.ts';
import * as qualityProfileQueries from '$pcd/queries/qualityProfiles/index.ts';
import * as delayProfileQueries from '$pcd/queries/delayProfiles/index.ts';

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
			arrSyncQueries.saveQualityProfilesSync(id, selections, {
				trigger: trigger || 'none',
				cron: cron || null
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
			arrSyncQueries.saveDelayProfilesSync(id, selections, {
				trigger: trigger || 'none',
				cron: cron || null
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
			arrSyncQueries.saveMediaManagementSync(id, {
				namingDatabaseId: namingDatabaseId ? parseInt(namingDatabaseId, 10) : null,
				qualityDefinitionsDatabaseId: qualityDefinitionsDatabaseId ? parseInt(qualityDefinitionsDatabaseId, 10) : null,
				mediaSettingsDatabaseId: mediaSettingsDatabaseId ? parseInt(mediaSettingsDatabaseId, 10) : null,
				trigger: trigger || 'none',
				cron: cron || null
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
	}
};
