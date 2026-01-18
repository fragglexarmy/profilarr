/**
 * Media Management update operations
 * Uses writeOperation() to append SQL operations to PCD layers
 */

import type { PCDCache } from '../../cache.ts';
import { writeOperation, type OperationLayer } from '../../writer.ts';
import { logger } from '$logger/logger.ts';
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

	// Track changes
	const changes: Record<string, { from: unknown; to: unknown }> = {};
	if (current.propers_repacks !== input.propers_repacks) {
		changes.propers_repacks = { from: current.propers_repacks, to: input.propers_repacks };
	}
	if (current.enable_media_info !== input.enable_media_info) {
		changes.enable_media_info = { from: current.enable_media_info, to: input.enable_media_info };
	}

	await logger.info('Save radarr media settings', {
		source: 'MediaManagement',
		meta: { id: current.id, changes }
	});

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

	// Track changes
	const changes: Record<string, { from: unknown; to: unknown }> = {};
	if (current.propers_repacks !== input.propers_repacks) {
		changes.propers_repacks = { from: current.propers_repacks, to: input.propers_repacks };
	}
	if (current.enable_media_info !== input.enable_media_info) {
		changes.enable_media_info = { from: current.enable_media_info, to: input.enable_media_info };
	}

	await logger.info('Save sonarr media settings', {
		source: 'MediaManagement',
		meta: { id: current.id, changes }
	});

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

	// Track changes
	const changes: Record<string, { from: unknown; to: unknown }> = {};
	if (current.rename !== input.rename) {
		changes.rename = { from: current.rename, to: input.rename };
	}
	if (current.replace_illegal_characters !== input.replace_illegal_characters) {
		changes.replace_illegal_characters = { from: current.replace_illegal_characters, to: input.replace_illegal_characters };
	}
	if (current.colon_replacement_format !== input.colon_replacement_format) {
		changes.colon_replacement_format = { from: current.colon_replacement_format, to: input.colon_replacement_format };
	}
	if (current.custom_colon_replacement_format !== input.custom_colon_replacement_format) {
		changes.custom_colon_replacement_format = { from: current.custom_colon_replacement_format, to: input.custom_colon_replacement_format };
	}
	if (current.standard_episode_format !== input.standard_episode_format) {
		changes.standard_episode_format = { from: current.standard_episode_format, to: input.standard_episode_format };
	}
	if (current.daily_episode_format !== input.daily_episode_format) {
		changes.daily_episode_format = { from: current.daily_episode_format, to: input.daily_episode_format };
	}
	if (current.anime_episode_format !== input.anime_episode_format) {
		changes.anime_episode_format = { from: current.anime_episode_format, to: input.anime_episode_format };
	}
	if (current.series_folder_format !== input.series_folder_format) {
		changes.series_folder_format = { from: current.series_folder_format, to: input.series_folder_format };
	}
	if (current.season_folder_format !== input.season_folder_format) {
		changes.season_folder_format = { from: current.season_folder_format, to: input.season_folder_format };
	}
	if (current.multi_episode_style !== input.multi_episode_style) {
		changes.multi_episode_style = { from: current.multi_episode_style, to: input.multi_episode_style };
	}

	await logger.info('Save sonarr naming settings', {
		source: 'MediaManagement',
		meta: { id: current.id, changes }
	});

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

	// Track changes
	const changes: Record<string, { from: unknown; to: unknown }> = {};
	if (current.rename !== input.rename) {
		changes.rename = { from: current.rename, to: input.rename };
	}
	if (current.replace_illegal_characters !== input.replace_illegal_characters) {
		changes.replace_illegal_characters = { from: current.replace_illegal_characters, to: input.replace_illegal_characters };
	}
	if (current.colon_replacement_format !== input.colon_replacement_format) {
		changes.colon_replacement_format = { from: current.colon_replacement_format, to: input.colon_replacement_format };
	}
	if (current.movie_format !== input.movie_format) {
		changes.movie_format = { from: current.movie_format, to: input.movie_format };
	}
	if (current.movie_folder_format !== input.movie_folder_format) {
		changes.movie_folder_format = { from: current.movie_folder_format, to: input.movie_folder_format };
	}

	await logger.info('Save radarr naming settings', {
		source: 'MediaManagement',
		meta: { id: current.id, changes }
	});

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
	quality_name: string;
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

	// Track changes per quality definition
	const changes: Record<string, { from: unknown; to: unknown }> = {};

	// Build queries for each changed definition
	const queries = input.map((def) => {
		const currentDef = current.find((c) => c.quality_name === def.quality_name);
		if (!currentDef) {
			throw new Error(`Quality definition not found for quality_name: ${def.quality_name}`);
		}

		// Track changes for this definition
		const defChanges: Record<string, { from: unknown; to: unknown }> = {};
		if (currentDef.min_size !== def.min_size) {
			defChanges.min_size = { from: currentDef.min_size, to: def.min_size };
		}
		if (currentDef.max_size !== def.max_size) {
			defChanges.max_size = { from: currentDef.max_size, to: def.max_size };
		}
		if (currentDef.preferred_size !== def.preferred_size) {
			defChanges.preferred_size = { from: currentDef.preferred_size, to: def.preferred_size };
		}
		if (Object.keys(defChanges).length > 0) {
			changes[currentDef.quality_name] = defChanges as { from: unknown; to: unknown };
		}

		return db
			.updateTable('radarr_quality_definitions')
			.set({
				min_size: def.min_size,
				max_size: def.max_size,
				preferred_size: def.preferred_size
			})
			.where('quality_name', '=', def.quality_name)
			// Value guards
			.where('min_size', '=', currentDef.min_size)
			.where('max_size', '=', currentDef.max_size)
			.where('preferred_size', '=', currentDef.preferred_size)
			.compile();
	});

	await logger.info('Save radarr quality definitions', {
		source: 'MediaManagement',
		meta: { changes }
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

	// Track changes per quality definition
	const changes: Record<string, { from: unknown; to: unknown }> = {};

	// Build queries for each changed definition
	const queries = input.map((def) => {
		const currentDef = current.find((c) => c.quality_name === def.quality_name);
		if (!currentDef) {
			throw new Error(`Quality definition not found for quality_name: ${def.quality_name}`);
		}

		// Track changes for this definition
		const defChanges: Record<string, { from: unknown; to: unknown }> = {};
		if (currentDef.min_size !== def.min_size) {
			defChanges.min_size = { from: currentDef.min_size, to: def.min_size };
		}
		if (currentDef.max_size !== def.max_size) {
			defChanges.max_size = { from: currentDef.max_size, to: def.max_size };
		}
		if (currentDef.preferred_size !== def.preferred_size) {
			defChanges.preferred_size = { from: currentDef.preferred_size, to: def.preferred_size };
		}
		if (Object.keys(defChanges).length > 0) {
			changes[currentDef.quality_name] = defChanges as { from: unknown; to: unknown };
		}

		return db
			.updateTable('sonarr_quality_definitions')
			.set({
				min_size: def.min_size,
				max_size: def.max_size,
				preferred_size: def.preferred_size
			})
			.where('quality_name', '=', def.quality_name)
			// Value guards
			.where('min_size', '=', currentDef.min_size)
			.where('max_size', '=', currentDef.max_size)
			.where('preferred_size', '=', currentDef.preferred_size)
			.compile();
	});

	await logger.info('Save sonarr quality definitions', {
		source: 'MediaManagement',
		meta: { changes }
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
