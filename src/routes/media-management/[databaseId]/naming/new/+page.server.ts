import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { pcdManager } from '$pcd/pcd.ts';
import { canWriteToBase } from '$pcd/writer.ts';
import type { OperationLayer } from '$pcd/writer.ts';
import type { ArrType } from '$pcd/queries/mediaManagement/naming/types.ts';
import type { RadarrColonReplacementFormat, ColonReplacementFormat, MultiEpisodeStyle } from '$lib/shared/mediaManagement.ts';
import { createRadarrNaming, createSonarrNaming } from '$pcd/queries/mediaManagement/naming/index.ts';

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	return {
		canWriteToBase: parentData.canWriteToBase
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
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
		const arrType = formData.get('arrType') as ArrType;
		const name = formData.get('name') as string;
		const layer = (formData.get('layer') as OperationLayer) || 'user';

		if (!name?.trim()) {
			return fail(400, { error: 'Name is required' });
		}

		if (!arrType || (arrType !== 'radarr' && arrType !== 'sonarr')) {
			return fail(400, { error: 'Invalid arr type' });
		}

		if (layer === 'base' && !canWriteToBase(currentDatabaseId)) {
			return fail(403, { error: 'Cannot write to base layer without personal access token' });
		}

		if (arrType === 'radarr') {
			const rename = formData.get('rename') === 'true';
			const movieFormat = formData.get('movieFormat') as string;
			const movieFolderFormat = formData.get('movieFolderFormat') as string;
			const replaceIllegalCharacters = formData.get('replaceIllegalCharacters') === 'true';
			const colonReplacementFormat = formData.get(
				'colonReplacementFormat'
			) as RadarrColonReplacementFormat;

			const result = await createRadarrNaming({
				databaseId: currentDatabaseId,
				cache,
				layer,
				input: {
					name: name.trim(),
					rename,
					movieFormat: movieFormat || '',
					movieFolderFormat: movieFolderFormat || '',
					replaceIllegalCharacters,
					colonReplacementFormat: colonReplacementFormat || 'delete'
				}
			});

			if (!result.success) {
				return fail(500, { error: result.error || 'Failed to create radarr naming config' });
			}
		} else {
			const rename = formData.get('rename') === 'true';
			const standardEpisodeFormat = formData.get('standardEpisodeFormat') as string;
			const dailyEpisodeFormat = formData.get('dailyEpisodeFormat') as string;
			const animeEpisodeFormat = formData.get('animeEpisodeFormat') as string;
			const seriesFolderFormat = formData.get('seriesFolderFormat') as string;
			const seasonFolderFormat = formData.get('seasonFolderFormat') as string;
			const replaceIllegalCharacters = formData.get('replaceIllegalCharacters') === 'true';
			const colonReplacementFormat = formData.get(
				'colonReplacementFormat'
			) as ColonReplacementFormat;
			const customColonReplacementFormat = formData.get('customColonReplacementFormat') as string;
			const multiEpisodeStyle = formData.get('multiEpisodeStyle') as MultiEpisodeStyle;

			const result = await createSonarrNaming({
				databaseId: currentDatabaseId,
				cache,
				layer,
				input: {
					name: name.trim(),
					rename,
					standardEpisodeFormat: standardEpisodeFormat || '',
					dailyEpisodeFormat: dailyEpisodeFormat || '',
					animeEpisodeFormat: animeEpisodeFormat || '',
					seriesFolderFormat: seriesFolderFormat || '',
					seasonFolderFormat: seasonFolderFormat || '',
					replaceIllegalCharacters,
					colonReplacementFormat: colonReplacementFormat || 'delete',
					customColonReplacementFormat: customColonReplacementFormat || null,
					multiEpisodeStyle: multiEpisodeStyle || 'extend'
				}
			});

			if (!result.success) {
				return fail(500, { error: result.error || 'Failed to create sonarr naming config' });
			}
		}

		throw redirect(303, `/media-management/${databaseId}/naming`);
	}
};
