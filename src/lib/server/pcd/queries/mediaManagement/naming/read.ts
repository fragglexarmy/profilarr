/**
 * Naming read operations (list and get)
 */

import type { PCDCache } from '../../../cache.ts';
import type {
	RadarrNaming,
	SonarrNaming,
	RadarrColonReplacementFormat
} from '$lib/shared/mediaManagement.ts';
import { colonReplacementFromDb, multiEpisodeStyleFromDb } from '$lib/shared/mediaManagement.ts';
import type { NamingListItem } from './types.ts';

// Note: name is PRIMARY KEY so never null, but Kysely types it as nullable
// because the generator doesn't detect non-INTEGER primary keys

export async function list(cache: PCDCache): Promise<NamingListItem[]> {
	const db = cache.kb;

	const [radarrRows, sonarrRows] = await Promise.all([
		db.selectFrom('radarr_naming').select(['name', 'rename', 'updated_at']).execute(),
		db.selectFrom('sonarr_naming').select(['name', 'rename', 'updated_at']).execute()
	]);

	const items: NamingListItem[] = [];

	for (const row of radarrRows) {
		items.push({
			name: row.name!,
			arr_type: 'radarr',
			rename: row.rename === 1,
			updated_at: row.updated_at
		});
	}

	for (const row of sonarrRows) {
		items.push({
			name: row.name!,
			arr_type: 'sonarr',
			rename: row.rename === 1,
			updated_at: row.updated_at
		});
	}

	return items;
}

export async function getRadarrByName(
	cache: PCDCache,
	name: string
): Promise<RadarrNaming | null> {
	const db = cache.kb;

	const row = await db
		.selectFrom('radarr_naming')
		.select([
			'name',
			'rename',
			'movie_format',
			'movie_folder_format',
			'replace_illegal_characters',
			'colon_replacement_format'
		])
		.where('name', '=', name)
		.executeTakeFirst();

	if (!row) return null;

	return {
		name: row.name!,
		rename: row.rename === 1,
		movie_format: row.movie_format,
		movie_folder_format: row.movie_folder_format,
		replace_illegal_characters: row.replace_illegal_characters === 1,
		colon_replacement_format: row.colon_replacement_format as RadarrColonReplacementFormat
	};
}

export async function getSonarrByName(
	cache: PCDCache,
	name: string
): Promise<SonarrNaming | null> {
	const db = cache.kb;

	const row = await db
		.selectFrom('sonarr_naming')
		.select([
			'name',
			'rename',
			'standard_episode_format',
			'daily_episode_format',
			'anime_episode_format',
			'series_folder_format',
			'season_folder_format',
			'replace_illegal_characters',
			'colon_replacement_format',
			'custom_colon_replacement_format',
			'multi_episode_style'
		])
		.where('name', '=', name)
		.executeTakeFirst();

	if (!row) return null;

	return {
		name: row.name!,
		rename: row.rename === 1,
		standard_episode_format: row.standard_episode_format,
		daily_episode_format: row.daily_episode_format,
		anime_episode_format: row.anime_episode_format,
		series_folder_format: row.series_folder_format,
		season_folder_format: row.season_folder_format,
		replace_illegal_characters: row.replace_illegal_characters === 1,
		colon_replacement_format: colonReplacementFromDb(row.colon_replacement_format),
		custom_colon_replacement_format: row.custom_colon_replacement_format,
		multi_episode_style: multiEpisodeStyleFromDb(row.multi_episode_style)
	};
}
