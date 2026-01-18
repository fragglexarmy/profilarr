import { error, fail } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import { pcdManager } from '$pcd/pcd.ts';
import { canWriteToBase } from '$pcd/writer.ts';
import type { OperationLayer } from '$pcd/writer.ts';
import * as mediaManagementQueries from '$pcd/queries/mediaManagement/index.ts';
import type { PropersRepacks, RadarrColonReplacementFormat } from '$lib/shared/mediaManagement.ts';
import { RADARR_COLON_REPLACEMENT_OPTIONS } from '$lib/shared/mediaManagement.ts';
import { logger } from '$logger/logger.ts';

export const load: ServerLoad = async ({ params }) => {
	const { databaseId } = params;

	// Parse the database ID
	const currentDatabaseId = parseInt(databaseId as string, 10);

	// Get the cache for the database
	const cache = pcdManager.getCache(currentDatabaseId);
	if (!cache) {
		throw error(500, 'Database cache not available');
	}

	// Load Radarr media management data
	const mediaManagement = await mediaManagementQueries.getRadarr(cache);

	return {
		mediaManagement,
		canWriteToBase: canWriteToBase(currentDatabaseId)
	};
};

export const actions: Actions = {
	updateMediaSettings: async ({ request, params }) => {
		const { databaseId } = params;

		if (!databaseId) {
			return fail(400, { error: 'Missing database ID' });
		}

		const currentDatabaseId = parseInt(databaseId, 10);
		if (isNaN(currentDatabaseId)) {
			return fail(400, { error: 'Invalid database ID' });
		}

		const cache = pcdManager.getCache(currentDatabaseId);
		if (!cache) {
			return fail(500, { error: 'Database cache not available' });
		}

		const formData = await request.formData();

		// Get layer
		const layer = (formData.get('layer') as OperationLayer) || 'user';

		// Check layer permission
		if (layer === 'base' && !canWriteToBase(currentDatabaseId)) {
			return fail(403, { error: 'Cannot write to base layer without personal access token' });
		}

		// Get current data for value guards
		const currentData = await mediaManagementQueries.getRadarr(cache);
		if (!currentData.mediaSettings) {
			return fail(404, { error: 'Media settings not found' });
		}

		// Parse form data
		const propersRepacks = formData.get('propersRepacks') as PropersRepacks;
		const enableMediaInfo = formData.get('enableMediaInfo') === 'on';

		// Validate propers_repacks
		const validOptions: PropersRepacks[] = [
			'doNotPrefer',
			'preferAndUpgrade',
			'doNotUpgradeAutomatically'
		];
		if (!validOptions.includes(propersRepacks)) {
			await logger.warn('Invalid propers and repacks option', {
				source: 'MediaManagement',
				meta: { databaseId: currentDatabaseId, propersRepacks }
			});
			return fail(400, { error: 'Invalid propers and repacks option' });
		}

		const result = await mediaManagementQueries.updateRadarrMediaSettings({
			databaseId: currentDatabaseId,
			cache,
			layer,
			current: currentData.mediaSettings,
			input: {
				propers_repacks: propersRepacks,
				enable_media_info: enableMediaInfo
			}
		});

		if (!result.success) {
			await logger.error('Failed to update Radarr media settings', {
				source: 'MediaManagement',
				meta: { databaseId: currentDatabaseId, error: result.error }
			});
			return fail(500, { error: result.error || 'Failed to update media settings' });
		}

		return { success: true };
	},

	updateNaming: async ({ request, params }) => {
		const { databaseId } = params;

		if (!databaseId) {
			return fail(400, { error: 'Missing database ID' });
		}

		const currentDatabaseId = parseInt(databaseId, 10);
		if (isNaN(currentDatabaseId)) {
			return fail(400, { error: 'Invalid database ID' });
		}

		const cache = pcdManager.getCache(currentDatabaseId);
		if (!cache) {
			return fail(500, { error: 'Database cache not available' });
		}

		const formData = await request.formData();

		// Get layer
		const layer = (formData.get('layer') as OperationLayer) || 'user';

		// Check layer permission
		if (layer === 'base' && !canWriteToBase(currentDatabaseId)) {
			return fail(403, { error: 'Cannot write to base layer without personal access token' });
		}

		// Get current data for value guards
		const currentData = await mediaManagementQueries.getRadarr(cache);
		if (!currentData.naming) {
			return fail(404, { error: 'Naming settings not found' });
		}

		// Parse form data
		const rename = formData.get('rename') === 'on';
		const replaceIllegalCharacters = formData.get('replaceIllegalCharacters') === 'on';
		const colonReplacement = formData.get('colonReplacement') as RadarrColonReplacementFormat;
		const movieFormat = formData.get('movieFormat') as string;
		const movieFolderFormat = formData.get('movieFolderFormat') as string;

		// Validate colon replacement (only if replace illegal characters is on)
		if (replaceIllegalCharacters) {
			const validColonOptions = RADARR_COLON_REPLACEMENT_OPTIONS.map((o) => o.value);
			if (!validColonOptions.includes(colonReplacement)) {
				await logger.warn('Invalid colon replacement option', {
					source: 'MediaManagement',
					meta: { databaseId: currentDatabaseId, colonReplacement }
				});
				return fail(400, { error: 'Invalid colon replacement option' });
			}
		}

		// Default colon replacement when not replacing illegal characters
		const effectiveColonReplacement = replaceIllegalCharacters ? colonReplacement : 'delete';

		const result = await mediaManagementQueries.updateRadarrNaming({
			databaseId: currentDatabaseId,
			cache,
			layer,
			current: currentData.naming,
			input: {
				rename,
				replace_illegal_characters: replaceIllegalCharacters,
				colon_replacement_format: effectiveColonReplacement,
				movie_format: movieFormat,
				movie_folder_format: movieFolderFormat
			}
		});

		if (!result.success) {
			await logger.error('Failed to update Radarr naming settings', {
				source: 'MediaManagement',
				meta: { databaseId: currentDatabaseId, error: result.error }
			});
			return fail(500, { error: result.error || 'Failed to update naming settings' });
		}

		return { success: true };
	},

	updateQualityDefinitions: async ({ request, params }) => {
		const { databaseId } = params;

		if (!databaseId) {
			return fail(400, { error: 'Missing database ID' });
		}

		const currentDatabaseId = parseInt(databaseId, 10);
		if (isNaN(currentDatabaseId)) {
			return fail(400, { error: 'Invalid database ID' });
		}

		const cache = pcdManager.getCache(currentDatabaseId);
		if (!cache) {
			return fail(500, { error: 'Database cache not available' });
		}

		const formData = await request.formData();

		// Get layer
		const layer = (formData.get('layer') as OperationLayer) || 'user';

		// Check layer permission
		if (layer === 'base' && !canWriteToBase(currentDatabaseId)) {
			return fail(403, { error: 'Cannot write to base layer without personal access token' });
		}

		// Get current data for value guards
		const currentData = await mediaManagementQueries.getRadarr(cache);
		if (!currentData.qualityDefinitions || currentData.qualityDefinitions.length === 0) {
			return fail(404, { error: 'Quality definitions not found' });
		}

		// Parse the definitions from form data (JSON string)
		const definitionsJson = formData.get('definitions') as string;
		if (!definitionsJson) {
			return fail(400, { error: 'Missing definitions data' });
		}

		let definitions: {
			quality_name: string;
			min_size: number;
			max_size: number;
			preferred_size: number;
		}[];
		try {
			definitions = JSON.parse(definitionsJson);
		} catch {
			return fail(400, { error: 'Invalid definitions JSON' });
		}

		// Validate definitions
		if (!Array.isArray(definitions) || definitions.length === 0) {
			return fail(400, { error: 'Invalid definitions format' });
		}

		const result = await mediaManagementQueries.updateRadarrQualityDefinitions({
			databaseId: currentDatabaseId,
			cache,
			layer,
			current: currentData.qualityDefinitions,
			input: definitions
		});

		if (!result.success) {
			await logger.error('Failed to update Radarr quality definitions', {
				source: 'MediaManagement',
				meta: { databaseId: currentDatabaseId, error: result.error }
			});
			return fail(500, { error: result.error || 'Failed to update quality definitions' });
		}

		return { success: true };
	}
};
