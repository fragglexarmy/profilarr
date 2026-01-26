/**
 * Update naming config operations
 */

import type { PCDCache } from '../../../cache.ts';
import { writeOperation, type OperationLayer } from '../../../writer.ts';
import type { RadarrColonReplacementFormat, ColonReplacementFormat, MultiEpisodeStyle } from '$lib/shared/mediaManagement.ts';
import { radarrColonReplacementToDb, colonReplacementToDb, multiEpisodeStyleToDb } from '$lib/shared/mediaManagement.ts';

export interface UpdateRadarrNamingInput {
	name: string;
	rename: boolean;
	movieFormat: string;
	movieFolderFormat: string;
	replaceIllegalCharacters: boolean;
	colonReplacementFormat: RadarrColonReplacementFormat;
}

export interface UpdateRadarrNamingOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	currentName: string;
	input: UpdateRadarrNamingInput;
}

export async function updateRadarrNaming(options: UpdateRadarrNamingOptions) {
	const { databaseId, cache, layer, currentName, input } = options;
	const db = cache.kb;

	// If renaming, check if new name already exists
	if (input.name !== currentName) {
		const existing = await db
			.selectFrom('radarr_naming')
			.where('name', '=', input.name)
			.select('name')
			.executeTakeFirst();

		if (existing) {
			throw new Error(`A radarr naming config with name "${input.name}" already exists`);
		}
	}

	const updateQuery = db
		.updateTable('radarr_naming')
		.set({
			name: input.name,
			rename: input.rename ? 1 : 0,
			movie_format: input.movieFormat,
			movie_folder_format: input.movieFolderFormat,
			replace_illegal_characters: input.replaceIllegalCharacters ? 1 : 0,
			colon_replacement_format: radarrColonReplacementToDb(input.colonReplacementFormat)
		})
		.where('name', '=', currentName)
		.compile();

	return writeOperation({
		databaseId,
		layer,
		description: `update-radarr-naming-${input.name}`,
		queries: [updateQuery],
		metadata: {
			operation: 'update',
			entity: 'radarr_naming',
			name: input.name
		}
	});
}

export interface UpdateSonarrNamingInput {
	name: string;
	rename: boolean;
	standardEpisodeFormat: string;
	dailyEpisodeFormat: string;
	animeEpisodeFormat: string;
	seriesFolderFormat: string;
	seasonFolderFormat: string;
	replaceIllegalCharacters: boolean;
	colonReplacementFormat: ColonReplacementFormat;
	customColonReplacementFormat: string | null;
	multiEpisodeStyle: MultiEpisodeStyle;
}

export interface UpdateSonarrNamingOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	currentName: string;
	input: UpdateSonarrNamingInput;
}

export async function updateSonarrNaming(options: UpdateSonarrNamingOptions) {
	const { databaseId, cache, layer, currentName, input } = options;
	const db = cache.kb;

	// If renaming, check if new name already exists
	if (input.name !== currentName) {
		const existing = await db
			.selectFrom('sonarr_naming')
			.where('name', '=', input.name)
			.select('name')
			.executeTakeFirst();

		if (existing) {
			throw new Error(`A sonarr naming config with name "${input.name}" already exists`);
		}
	}

	const updateQuery = db
		.updateTable('sonarr_naming')
		.set({
			name: input.name,
			rename: input.rename ? 1 : 0,
			standard_episode_format: input.standardEpisodeFormat,
			daily_episode_format: input.dailyEpisodeFormat,
			anime_episode_format: input.animeEpisodeFormat,
			series_folder_format: input.seriesFolderFormat,
			season_folder_format: input.seasonFolderFormat,
			replace_illegal_characters: input.replaceIllegalCharacters ? 1 : 0,
			colon_replacement_format: colonReplacementToDb(input.colonReplacementFormat),
			custom_colon_replacement_format: input.customColonReplacementFormat,
			multi_episode_style: multiEpisodeStyleToDb(input.multiEpisodeStyle)
		})
		.where('name', '=', currentName)
		.compile();

	return writeOperation({
		databaseId,
		layer,
		description: `update-sonarr-naming-${input.name}`,
		queries: [updateQuery],
		metadata: {
			operation: 'update',
			entity: 'sonarr_naming',
			name: input.name
		}
	});
}
