/**
 * Combined getters for media management configs
 * Provides backward compatibility for the syncer which expects combined objects
 *
 * NOTE: This returns the first available config for each type.
 * The syncer will need to be updated later to support selecting specific named configs.
 */

import type { PCDCache } from '../../cache.ts';
import type { MediaSettings, RadarrNaming, SonarrNaming } from '$lib/shared/mediaManagement.ts';
import { getRadarrByName as getRadarrMediaSettings, getSonarrByName as getSonarrMediaSettings } from './media-settings/read.ts';
import { getRadarrByName as getRadarrNaming, getSonarrByName as getSonarrNaming } from './naming/read.ts';
import { getRadarrByName as getRadarrQualityDefs, getSonarrByName as getSonarrQualityDefs } from './quality-definitions/read.ts';
import { list as listMediaSettings } from './media-settings/read.ts';
import { list as listNaming } from './naming/read.ts';
import { list as listQualityDefs } from './quality-definitions/read.ts';
import type { QualityDefinitionEntry } from './quality-definitions/types.ts';

export interface QualityDefinition {
	quality_name: string;
	min_size: number;
	max_size: number | null;
	preferred_size: number | null;
}

export interface RadarrCombined {
	mediaSettings: MediaSettings | null;
	naming: RadarrNaming | null;
	qualityDefinitions: QualityDefinition[];
}

export interface SonarrCombined {
	mediaSettings: MediaSettings | null;
	naming: SonarrNaming | null;
	qualityDefinitions: QualityDefinition[];
}

/**
 * Get all Radarr media management configs (returns first available of each type)
 */
export async function getRadarr(cache: PCDCache): Promise<RadarrCombined> {
	// Get the first available media settings config
	const mediaSettingsList = await listMediaSettings(cache);
	const radarrMediaSettings = mediaSettingsList.find(c => c.arr_type === 'radarr');
	const mediaSettings = radarrMediaSettings
		? await getRadarrMediaSettings(cache, radarrMediaSettings.name)
		: null;

	// Get the first available naming config
	const namingList = await listNaming(cache);
	const radarrNaming = namingList.find(c => c.arr_type === 'radarr');
	const naming = radarrNaming
		? await getRadarrNaming(cache, radarrNaming.name)
		: null;

	// Get quality definitions (not yet refactored to multi-config)
	const qualityDefinitions = await getQualityDefinitions(cache, 'radarr');

	return {
		mediaSettings,
		naming,
		qualityDefinitions
	};
}

/**
 * Get all Sonarr media management configs (returns first available of each type)
 */
export async function getSonarr(cache: PCDCache): Promise<SonarrCombined> {
	// Get the first available media settings config
	const mediaSettingsList = await listMediaSettings(cache);
	const sonarrMediaSettings = mediaSettingsList.find(c => c.arr_type === 'sonarr');
	const mediaSettings = sonarrMediaSettings
		? await getSonarrMediaSettings(cache, sonarrMediaSettings.name)
		: null;

	// Get the first available naming config
	const namingList = await listNaming(cache);
	const sonarrNaming = namingList.find(c => c.arr_type === 'sonarr');
	const naming = sonarrNaming
		? await getSonarrNaming(cache, sonarrNaming.name)
		: null;

	// Get quality definitions (not yet refactored to multi-config)
	const qualityDefinitions = await getQualityDefinitions(cache, 'sonarr');

	return {
		mediaSettings,
		naming,
		qualityDefinitions
	};
}

/**
 * Get quality definitions for an arr type (returns first available config)
 */
async function getQualityDefinitions(cache: PCDCache, arrType: 'radarr' | 'sonarr'): Promise<QualityDefinition[]> {
	const qualityDefsList = await listQualityDefs(cache);
	const config = qualityDefsList.find(c => c.arr_type === arrType);

	if (!config) {
		return [];
	}

	const getByName = arrType === 'radarr' ? getRadarrQualityDefs : getSonarrQualityDefs;
	const fullConfig = await getByName(cache, config.name);

	if (!fullConfig) {
		return [];
	}

	return fullConfig.entries.map((entry: QualityDefinitionEntry) => ({
		quality_name: entry.quality_name,
		min_size: entry.min_size,
		max_size: entry.max_size,
		preferred_size: entry.preferred_size
	}));
}
