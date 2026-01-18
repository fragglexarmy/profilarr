/**
 * Media Management get queries
 */

import type { PCDCache } from '../../cache.ts';
import type {
	MediaManagementData,
	RadarrMediaManagementData,
	SonarrMediaManagementData,
	QualityDefinition,
	RadarrNaming,
	SonarrNaming,
	MediaSettings,
	PropersRepacks
} from './types.ts';
import {
	colonReplacementFromDb,
	multiEpisodeStyleFromDb,
	radarrColonReplacementFromDb
} from './types.ts';

/**
 * Get Radarr media management data
 */
export async function getRadarr(cache: PCDCache): Promise<RadarrMediaManagementData> {
	const db = cache.kb;

	const [qualityDefinitions, naming, mediaSettings] = await Promise.all([
		getRadarrQualityDefinitions(db),
		getRadarrNaming(db),
		getRadarrMediaSettings(db)
	]);

	return { qualityDefinitions, naming, mediaSettings };
}

/**
 * Get Sonarr media management data
 */
export async function getSonarr(cache: PCDCache): Promise<SonarrMediaManagementData> {
	const db = cache.kb;

	const [qualityDefinitions, naming, mediaSettings] = await Promise.all([
		getSonarrQualityDefinitions(db),
		getSonarrNaming(db),
		getSonarrMediaSettings(db)
	]);

	return { qualityDefinitions, naming, mediaSettings };
}

/**
 * Get all media management data for a PCD database
 */
export async function get(cache: PCDCache): Promise<MediaManagementData> {
	const db = cache.kb;

	// Fetch all data in parallel
	const [
		radarrQualityDefs,
		sonarrQualityDefs,
		radarrNaming,
		sonarrNaming,
		radarrMediaSettings,
		sonarrMediaSettings
	] = await Promise.all([
		getRadarrQualityDefinitions(db),
		getSonarrQualityDefinitions(db),
		getRadarrNaming(db),
		getSonarrNaming(db),
		getRadarrMediaSettings(db),
		getSonarrMediaSettings(db)
	]);

	return {
		qualityDefinitions: {
			radarr: radarrQualityDefs,
			sonarr: sonarrQualityDefs
		},
		naming: {
			radarr: radarrNaming,
			sonarr: sonarrNaming
		},
		mediaSettings: {
			radarr: radarrMediaSettings,
			sonarr: sonarrMediaSettings
		}
	};
}

/**
 * Get Radarr quality definitions with quality names
 */
async function getRadarrQualityDefinitions(db: PCDCache['kb']): Promise<QualityDefinition[]> {
	const rows = await db
		.selectFrom('radarr_quality_definitions as rqd')
		.innerJoin('qualities as q', 'q.name', 'rqd.quality_name')
		.select(['rqd.quality_name', 'rqd.min_size', 'rqd.max_size', 'rqd.preferred_size'])
		.orderBy('rqd.quality_name')
		.execute();

	return rows.map((row) => ({
		quality_name: row.quality_name,
		min_size: row.min_size,
		max_size: row.max_size,
		preferred_size: row.preferred_size
	}));
}

/**
 * Get Sonarr quality definitions with quality names
 */
async function getSonarrQualityDefinitions(db: PCDCache['kb']): Promise<QualityDefinition[]> {
	const rows = await db
		.selectFrom('sonarr_quality_definitions as sqd')
		.innerJoin('qualities as q', 'q.name', 'sqd.quality_name')
		.select(['sqd.quality_name', 'sqd.min_size', 'sqd.max_size', 'sqd.preferred_size'])
		.orderBy('sqd.quality_name')
		.execute();

	return rows.map((row) => ({
		quality_name: row.quality_name,
		min_size: row.min_size,
		max_size: row.max_size,
		preferred_size: row.preferred_size
	}));
}

/**
 * Get Radarr naming settings
 */
async function getRadarrNaming(db: PCDCache['kb']): Promise<RadarrNaming | null> {
	const row = await db
		.selectFrom('radarr_naming')
		.select([
			'id',
			'rename',
			'movie_format',
			'movie_folder_format',
			'replace_illegal_characters',
			'colon_replacement_format'
		])
		.executeTakeFirst();

	if (!row) return null;

	return {
		id: row.id,
		rename: row.rename === 1,
		movie_format: row.movie_format,
		movie_folder_format: row.movie_folder_format,
		replace_illegal_characters: row.replace_illegal_characters === 1,
		colon_replacement_format: radarrColonReplacementFromDb(row.colon_replacement_format as number)
	};
}

/**
 * Get Sonarr naming settings
 */
async function getSonarrNaming(db: PCDCache['kb']): Promise<SonarrNaming | null> {
	const row = await db
		.selectFrom('sonarr_naming')
		.select([
			'id',
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
		.executeTakeFirst();

	if (!row) return null;

	return {
		id: row.id,
		rename: row.rename === 1,
		standard_episode_format: row.standard_episode_format,
		daily_episode_format: row.daily_episode_format,
		anime_episode_format: row.anime_episode_format,
		series_folder_format: row.series_folder_format,
		season_folder_format: row.season_folder_format,
		replace_illegal_characters: row.replace_illegal_characters === 1,
		colon_replacement_format: colonReplacementFromDb(row.colon_replacement_format as number),
		custom_colon_replacement_format: row.custom_colon_replacement_format,
		multi_episode_style: multiEpisodeStyleFromDb(row.multi_episode_style as number)
	};
}

/**
 * Get Radarr media settings
 */
async function getRadarrMediaSettings(db: PCDCache['kb']): Promise<MediaSettings | null> {
	const row = await db
		.selectFrom('radarr_media_settings')
		.select(['id', 'propers_repacks', 'enable_media_info'])
		.executeTakeFirst();

	if (!row) return null;

	return {
		id: row.id,
		propers_repacks: row.propers_repacks as PropersRepacks,
		enable_media_info: row.enable_media_info === 1
	};
}

/**
 * Get Sonarr media settings
 */
async function getSonarrMediaSettings(db: PCDCache['kb']): Promise<MediaSettings | null> {
	const row = await db
		.selectFrom('sonarr_media_settings')
		.select(['id', 'propers_repacks', 'enable_media_info'])
		.executeTakeFirst();

	if (!row) return null;

	return {
		id: row.id,
		propers_repacks: row.propers_repacks as PropersRepacks,
		enable_media_info: row.enable_media_info === 1
	};
}
