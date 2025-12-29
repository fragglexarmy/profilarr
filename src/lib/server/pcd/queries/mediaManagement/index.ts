/**
 * Media Management queries
 */

// Export all types
export type {
	ArrType,
	QualityDefinition,
	QualityDefinitionsData,
	RadarrNaming,
	SonarrNaming,
	NamingData,
	MediaSettings,
	MediaSettingsData,
	MediaManagementData,
	RadarrMediaManagementData,
	SonarrMediaManagementData,
	PropersRepacks
} from './types.ts';

// Export constants and helpers
export { PROPERS_REPACKS_OPTIONS, getPropersRepacksLabel } from './types.ts';

// Export query functions
export { get, getRadarr, getSonarr } from './get.ts';

// Export update functions
export type {
	UpdateMediaSettingsInput,
	UpdateMediaSettingsOptions,
	UpdateSonarrNamingInput,
	UpdateSonarrNamingOptions,
	UpdateRadarrNamingInput,
	UpdateRadarrNamingOptions,
	UpdateQualityDefinitionInput,
	UpdateQualityDefinitionsOptions
} from './update.ts';
export {
	updateRadarrMediaSettings,
	updateSonarrMediaSettings,
	updateSonarrNaming,
	updateRadarrNaming,
	updateRadarrQualityDefinitions,
	updateSonarrQualityDefinitions
} from './update.ts';
