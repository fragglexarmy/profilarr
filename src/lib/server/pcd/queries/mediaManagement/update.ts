/**
 * Media Management update operations
 * Uses writeOperation() to append SQL operations to PCD layers
 */

import type { PCDCache } from '../../cache.ts';
import { writeOperation, type OperationLayer } from '../../writer.ts';
import type {
	PropersRepacks,
	ColonReplacementFormat,
	MultiEpisodeStyle,
	MediaSettings,
	SonarrNaming,
	RadarrNaming,
	RadarrColonReplacementFormat
} from '$lib/shared/mediaManagement.ts';
import { colonReplacementToDb, multiEpisodeStyleToDb, radarrColonReplacementToDb } from '$lib/shared/mediaManagement.ts';

// ============================================================================
// MEDIA SETTINGS
// ============================================================================

export interface UpdateMediaSettingsInput {
	propers_repacks: PropersRepacks;
	enable_media_info: boolean;
}

export interface UpdateMediaSettingsOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	current: MediaSettings;
	input: UpdateMediaSettingsInput;
}

/**
 * Update Radarr media settings
 */
export async function updateRadarrMediaSettings(options: UpdateMediaSettingsOptions) {
	const { databaseId, cache, layer, current, input } = options;
	const db = cache.kb;

	const query = db
		.updateTable('radarr_media_settings')
		.set({
			propers_repacks: input.propers_repacks,
			enable_media_info: input.enable_media_info ? 1 : 0
		})
		.where('id', '=', current.id)
		// Value guards
		.where('propers_repacks', '=', current.propers_repacks)
		.where('enable_media_info', '=', current.enable_media_info ? 1 : 0)
		.compile();

	return await writeOperation({
		databaseId,
		layer,
		description: 'update-radarr-media-settings',
		queries: [query],
		metadata: {
			operation: 'update',
			entity: 'radarr_media_settings',
			name: 'media-settings'
		}
	});
}

/**
 * Update Sonarr media settings
 */
export async function updateSonarrMediaSettings(options: UpdateMediaSettingsOptions) {
	const { databaseId, cache, layer, current, input } = options;
	const db = cache.kb;

	const query = db
		.updateTable('sonarr_media_settings')
		.set({
			propers_repacks: input.propers_repacks,
			enable_media_info: input.enable_media_info ? 1 : 0
		})
		.where('id', '=', current.id)
		// Value guards
		.where('propers_repacks', '=', current.propers_repacks)
		.where('enable_media_info', '=', current.enable_media_info ? 1 : 0)
		.compile();

	return await writeOperation({
		databaseId,
		layer,
		description: 'update-sonarr-media-settings',
		queries: [query],
		metadata: {
			operation: 'update',
			entity: 'sonarr_media_settings',
			name: 'media-settings'
		}
	});
}

// ============================================================================
// SONARR NAMING
// ============================================================================

export interface UpdateSonarrNamingInput {
	rename: boolean;
	replace_illegal_characters: boolean;
	colon_replacement_format: ColonReplacementFormat;
	custom_colon_replacement_format: string | null;
	standard_episode_format: string;
	daily_episode_format: string;
	anime_episode_format: string;
	series_folder_format: string;
	season_folder_format: string;
	multi_episode_style: MultiEpisodeStyle;
}

export interface UpdateSonarrNamingOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	current: SonarrNaming;
	input: UpdateSonarrNamingInput;
}

/**
 * Update Sonarr naming settings
 */
export async function updateSonarrNaming(options: UpdateSonarrNamingOptions) {
	const { databaseId, cache, layer, current, input } = options;
	const db = cache.kb;

	const query = db
		.updateTable('sonarr_naming')
		.set({
			rename: input.rename ? 1 : 0,
			replace_illegal_characters: input.replace_illegal_characters ? 1 : 0,
			colon_replacement_format: colonReplacementToDb(input.colon_replacement_format),
			custom_colon_replacement_format: input.custom_colon_replacement_format,
			standard_episode_format: input.standard_episode_format,
			daily_episode_format: input.daily_episode_format,
			anime_episode_format: input.anime_episode_format,
			series_folder_format: input.series_folder_format,
			season_folder_format: input.season_folder_format,
			multi_episode_style: multiEpisodeStyleToDb(input.multi_episode_style)
		})
		.where('id', '=', current.id)
		// Value guards - check key fields match expected values
		.where('rename', '=', current.rename ? 1 : 0)
		.where('replace_illegal_characters', '=', current.replace_illegal_characters ? 1 : 0)
		.compile();

	return await writeOperation({
		databaseId,
		layer,
		description: 'update-sonarr-naming',
		queries: [query],
		metadata: {
			operation: 'update',
			entity: 'sonarr_naming',
			name: 'naming-settings'
		}
	});
}

// ============================================================================
// RADARR NAMING
// ============================================================================

export interface UpdateRadarrNamingInput {
	rename: boolean;
	replace_illegal_characters: boolean;
	colon_replacement_format: RadarrColonReplacementFormat;
	movie_format: string;
	movie_folder_format: string;
}

export interface UpdateRadarrNamingOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	current: RadarrNaming;
	input: UpdateRadarrNamingInput;
}

/**
 * Update Radarr naming settings
 */
export async function updateRadarrNaming(options: UpdateRadarrNamingOptions) {
	const { databaseId, cache, layer, current, input } = options;
	const db = cache.kb;

	const query = db
		.updateTable('radarr_naming')
		.set({
			rename: input.rename ? 1 : 0,
			replace_illegal_characters: input.replace_illegal_characters ? 1 : 0,
			colon_replacement_format: radarrColonReplacementToDb(input.colon_replacement_format),
			movie_format: input.movie_format,
			movie_folder_format: input.movie_folder_format
		})
		.where('id', '=', current.id)
		// Value guards - check key fields match expected values
		.where('rename', '=', current.rename ? 1 : 0)
		.where('replace_illegal_characters', '=', current.replace_illegal_characters ? 1 : 0)
		.compile();

	return await writeOperation({
		databaseId,
		layer,
		description: 'update-radarr-naming',
		queries: [query],
		metadata: {
			operation: 'update',
			entity: 'radarr_naming',
			name: 'naming-settings'
		}
	});
}

// ============================================================================
// QUALITY DEFINITIONS
// ============================================================================

import type { QualityDefinition } from './types.ts';

export interface UpdateQualityDefinitionInput {
	quality_id: number;
	min_size: number;
	max_size: number;
	preferred_size: number;
}

export interface UpdateQualityDefinitionsOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	current: QualityDefinition[];
	input: UpdateQualityDefinitionInput[];
}

/**
 * Update Radarr quality definitions
 */
export async function updateRadarrQualityDefinitions(options: UpdateQualityDefinitionsOptions) {
	const { databaseId, cache, layer, current, input } = options;
	const db = cache.kb;

	// Build queries for each changed definition
	const queries = input.map((def) => {
		const currentDef = current.find((c) => c.quality_id === def.quality_id);
		if (!currentDef) {
			throw new Error(`Quality definition not found for quality_id: ${def.quality_id}`);
		}

		return db
			.updateTable('radarr_quality_definitions')
			.set({
				min_size: def.min_size,
				max_size: def.max_size,
				preferred_size: def.preferred_size
			})
			.where('quality_id', '=', def.quality_id)
			// Value guards
			.where('min_size', '=', currentDef.min_size)
			.where('max_size', '=', currentDef.max_size)
			.where('preferred_size', '=', currentDef.preferred_size)
			.compile();
	});

	return await writeOperation({
		databaseId,
		layer,
		description: 'update-radarr-quality-definitions',
		queries,
		metadata: {
			operation: 'update',
			entity: 'radarr_quality_definitions',
			name: 'quality-definitions'
		}
	});
}

/**
 * Update Sonarr quality definitions
 */
export async function updateSonarrQualityDefinitions(options: UpdateQualityDefinitionsOptions) {
	const { databaseId, cache, layer, current, input } = options;
	const db = cache.kb;

	// Build queries for each changed definition
	const queries = input.map((def) => {
		const currentDef = current.find((c) => c.quality_id === def.quality_id);
		if (!currentDef) {
			throw new Error(`Quality definition not found for quality_id: ${def.quality_id}`);
		}

		return db
			.updateTable('sonarr_quality_definitions')
			.set({
				min_size: def.min_size,
				max_size: def.max_size,
				preferred_size: def.preferred_size
			})
			.where('quality_id', '=', def.quality_id)
			// Value guards
			.where('min_size', '=', currentDef.min_size)
			.where('max_size', '=', currentDef.max_size)
			.where('preferred_size', '=', currentDef.preferred_size)
			.compile();
	});

	return await writeOperation({
		databaseId,
		layer,
		description: 'update-sonarr-quality-definitions',
		queries,
		metadata: {
			operation: 'update',
			entity: 'sonarr_quality_definitions',
			name: 'quality-definitions'
		}
	});
}
