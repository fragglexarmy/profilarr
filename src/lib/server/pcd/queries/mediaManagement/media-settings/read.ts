/**
 * Media settings read operations (list and get)
 */

import type { PCDCache } from '../../../cache.ts';
import type { MediaSettings, PropersRepacks } from '$lib/shared/mediaManagement.ts';
import type { MediaSettingsListItem } from './types.ts';

export async function list(cache: PCDCache): Promise<MediaSettingsListItem[]> {
	const db = cache.kb;

	const [radarrRows, sonarrRows] = await Promise.all([
		db.selectFrom('radarr_media_settings').select(['name', 'propers_repacks', 'enable_media_info', 'updated_at']).execute(),
		db.selectFrom('sonarr_media_settings').select(['name', 'propers_repacks', 'enable_media_info', 'updated_at']).execute()
	]);

	const items: MediaSettingsListItem[] = [];

	for (const row of radarrRows) {
		items.push({
			name: row.name!,
			arr_type: 'radarr',
			propers_repacks: row.propers_repacks,
			enable_media_info: row.enable_media_info === 1,
			updated_at: row.updated_at
		});
	}

	for (const row of sonarrRows) {
		items.push({
			name: row.name!,
			arr_type: 'sonarr',
			propers_repacks: row.propers_repacks,
			enable_media_info: row.enable_media_info === 1,
			updated_at: row.updated_at
		});
	}

	return items;
}

export async function getRadarrByName(
	cache: PCDCache,
	name: string
): Promise<MediaSettings | null> {
	const db = cache.kb;

	const row = await db
		.selectFrom('radarr_media_settings')
		.select(['name', 'propers_repacks', 'enable_media_info'])
		.where('name', '=', name)
		.executeTakeFirst();

	if (!row) return null;

	return {
		name: row.name!,
		propers_repacks: row.propers_repacks as PropersRepacks,
		enable_media_info: row.enable_media_info === 1
	};
}

export async function getSonarrByName(
	cache: PCDCache,
	name: string
): Promise<MediaSettings | null> {
	const db = cache.kb;

	const row = await db
		.selectFrom('sonarr_media_settings')
		.select(['name', 'propers_repacks', 'enable_media_info'])
		.where('name', '=', name)
		.executeTakeFirst();

	if (!row) return null;

	return {
		name: row.name!,
		propers_repacks: row.propers_repacks as PropersRepacks,
		enable_media_info: row.enable_media_info === 1
	};
}
