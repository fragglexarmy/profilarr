/**
 * Media Management query-specific types
 */

// ============================================================================
// QUALITY DEFINITIONS
// ============================================================================

export interface QualityDefinition {
	quality_name: string;
	min_size: number;
	max_size: number;
	preferred_size: number;
}

export interface QualityDefinitionsData {
	radarr: QualityDefinition[];
	sonarr: QualityDefinition[];
}

// ============================================================================
// NAMING SETTINGS
// ============================================================================

// Re-export naming types from shared
export type { RadarrNaming, SonarrNaming, ColonReplacementFormat, MultiEpisodeStyle, RadarrColonReplacementFormat } from '$lib/shared/mediaManagement.ts';
export {
	COLON_REPLACEMENT_OPTIONS,
	getColonReplacementLabel,
	colonReplacementFromDb,
	colonReplacementToDb,
	RADARR_COLON_REPLACEMENT_OPTIONS,
	getRadarrColonReplacementLabel,
	radarrColonReplacementFromDb,
	radarrColonReplacementToDb,
	MULTI_EPISODE_STYLE_OPTIONS,
	getMultiEpisodeStyleLabel,
	multiEpisodeStyleFromDb,
	multiEpisodeStyleToDb
} from '$lib/shared/mediaManagement.ts';

// Import types for local use in interfaces
import type { RadarrNaming, SonarrNaming } from '$lib/shared/mediaManagement.ts';

export interface NamingData {
	radarr: RadarrNaming | null;
	sonarr: SonarrNaming | null;
}

// ============================================================================
// MEDIA SETTINGS
// ============================================================================

// Re-export from shared for convenience
export type { PropersRepacks, MediaSettings } from '$lib/shared/mediaManagement.ts';
export { PROPERS_REPACKS_OPTIONS, getPropersRepacksLabel } from '$lib/shared/mediaManagement.ts';

import type { MediaSettings } from '$lib/shared/mediaManagement.ts';

export interface MediaSettingsData {
	radarr: MediaSettings | null;
	sonarr: MediaSettings | null;
}

// ============================================================================
// COMBINED DATA
// ============================================================================

export interface MediaManagementData {
	qualityDefinitions: QualityDefinitionsData;
	naming: NamingData;
	mediaSettings: MediaSettingsData;
}

// ============================================================================
// ARR-TYPE SPECIFIC DATA
// ============================================================================

export type ArrType = 'radarr' | 'sonarr';

export interface RadarrMediaManagementData {
	qualityDefinitions: QualityDefinition[];
	naming: RadarrNaming | null;
	mediaSettings: MediaSettings | null;
}

export interface SonarrMediaManagementData {
	qualityDefinitions: QualityDefinition[];
	naming: SonarrNaming | null;
	mediaSettings: MediaSettings | null;
}
