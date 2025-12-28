/**
 * Kysely Database Schema Types for PCD (Profilarr Compliant Database)
 * Auto-generated columns use Generated<T>
 */

import type { Generated } from 'kysely';

// ============================================================================
// CORE ENTITY TABLES
// ============================================================================

export interface TagsTable {
	id: Generated<number>;
	name: string;
	created_at: Generated<string>;
}

export interface LanguagesTable {
	id: Generated<number>;
	name: string;
	created_at: Generated<string>;
	updated_at: Generated<string>;
}

export interface RegularExpressionsTable {
	id: Generated<number>;
	name: string;
	pattern: string;
	regex101_id: string | null;
	description: string | null;
	created_at: Generated<string>;
	updated_at: Generated<string>;
}

export interface QualitiesTable {
	id: Generated<number>;
	name: string;
	created_at: Generated<string>;
	updated_at: Generated<string>;
}

export interface QualityApiMappingsTable {
	quality_id: number;
	arr_type: string;
	api_name: string;
	created_at: Generated<string>;
}

export interface CustomFormatsTable {
	id: Generated<number>;
	name: string;
	description: string | null;
	created_at: Generated<string>;
	updated_at: Generated<string>;
}

// ============================================================================
// DEPENDENT ENTITY TABLES
// ============================================================================

export interface QualityProfilesTable {
	id: Generated<number>;
	name: string;
	description: string | null;
	upgrades_allowed: number;
	minimum_custom_format_score: number;
	upgrade_until_score: number;
	upgrade_score_increment: number;
	created_at: Generated<string>;
	updated_at: Generated<string>;
}

export interface QualityGroupsTable {
	id: Generated<number>;
	quality_profile_id: number;
	name: string;
	created_at: Generated<string>;
	updated_at: Generated<string>;
}

export interface CustomFormatConditionsTable {
	id: Generated<number>;
	custom_format_id: number;
	name: string;
	type: string;
	arr_type: string;
	negate: number;
	required: number;
	created_at: Generated<string>;
	updated_at: Generated<string>;
}

// ============================================================================
// JUNCTION TABLES
// ============================================================================

export interface RegularExpressionTagsTable {
	regular_expression_id: number;
	tag_id: number;
}

export interface CustomFormatTagsTable {
	custom_format_id: number;
	tag_id: number;
}

export interface QualityProfileTagsTable {
	quality_profile_id: number;
	tag_id: number;
}

export interface QualityProfileLanguagesTable {
	quality_profile_id: number;
	language_id: number;
	type: string;
}

export interface QualityGroupMembersTable {
	quality_group_id: number;
	quality_id: number;
}

export interface QualityProfileQualitiesTable {
	id: Generated<number>;
	quality_profile_id: number;
	quality_id: number | null;
	quality_group_id: number | null;
	position: number;
	enabled: number;
	upgrade_until: number;
}

export interface QualityProfileCustomFormatsTable {
	quality_profile_id: number;
	custom_format_id: number;
	arr_type: string;
	score: number;
}

// ============================================================================
// CUSTOM FORMAT CONDITION TYPE TABLES
// ============================================================================

export interface ConditionPatternsTable {
	custom_format_condition_id: number;
	regular_expression_id: number;
}

export interface ConditionLanguagesTable {
	custom_format_condition_id: number;
	language_id: number;
	except_language: number;
}

export interface ConditionIndexerFlagsTable {
	custom_format_condition_id: number;
	flag: string;
}

export interface ConditionSourcesTable {
	custom_format_condition_id: number;
	source: string;
}

export interface ConditionResolutionsTable {
	custom_format_condition_id: number;
	resolution: string;
}

export interface ConditionQualityModifiersTable {
	custom_format_condition_id: number;
	quality_modifier: string;
}

export interface ConditionSizesTable {
	custom_format_condition_id: number;
	min_bytes: number | null;
	max_bytes: number | null;
}

export interface ConditionReleaseTypesTable {
	custom_format_condition_id: number;
	release_type: string;
}

export interface ConditionYearsTable {
	custom_format_condition_id: number;
	min_year: number | null;
	max_year: number | null;
}

// ============================================================================
// DELAY PROFILES
// ============================================================================

export interface DelayProfilesTable {
	id: Generated<number>;
	name: string;
	preferred_protocol: string;
	usenet_delay: number | null;
	torrent_delay: number | null;
	bypass_if_highest_quality: number;
	bypass_if_above_custom_format_score: number;
	minimum_custom_format_score: number | null;
	created_at: Generated<string>;
	updated_at: Generated<string>;
}

export interface DelayProfileTagsTable {
	delay_profile_id: number;
	tag_id: number;
}

// ============================================================================
// MEDIA MANAGEMENT TABLES
// ============================================================================

export interface RadarrQualityDefinitionsTable {
	quality_id: number;
	min_size: number;
	max_size: number;
	preferred_size: number;
	created_at: Generated<string>;
	updated_at: Generated<string>;
}

export interface SonarrQualityDefinitionsTable {
	quality_id: number;
	min_size: number;
	max_size: number;
	preferred_size: number;
	created_at: Generated<string>;
	updated_at: Generated<string>;
}

export interface RadarrNamingTable {
	id: number;
	rename: number;
	movie_format: string;
	movie_folder_format: string;
	replace_illegal_characters: number;
	colon_replacement_format: string;
	created_at: Generated<string>;
	updated_at: Generated<string>;
}

export interface SonarrNamingTable {
	id: number;
	rename: number;
	standard_episode_format: string;
	daily_episode_format: string;
	anime_episode_format: string;
	series_folder_format: string;
	season_folder_format: string;
	replace_illegal_characters: number;
	colon_replacement_format: number;
	custom_colon_replacement_format: string | null;
	multi_episode_style: number;
	created_at: Generated<string>;
	updated_at: Generated<string>;
}

export interface RadarrMediaSettingsTable {
	id: number;
	propers_repacks: string;
	enable_media_info: number;
	created_at: Generated<string>;
	updated_at: Generated<string>;
}

export interface SonarrMediaSettingsTable {
	id: number;
	propers_repacks: string;
	enable_media_info: number;
	created_at: Generated<string>;
	updated_at: Generated<string>;
}

// ============================================================================
// DATABASE INTERFACE
// ============================================================================

export interface PCDDatabase {
	tags: TagsTable;
	languages: LanguagesTable;
	regular_expressions: RegularExpressionsTable;
	qualities: QualitiesTable;
	custom_formats: CustomFormatsTable;
	quality_profiles: QualityProfilesTable;
	quality_groups: QualityGroupsTable;
	custom_format_conditions: CustomFormatConditionsTable;
	regular_expression_tags: RegularExpressionTagsTable;
	custom_format_tags: CustomFormatTagsTable;
	quality_profile_tags: QualityProfileTagsTable;
	quality_profile_languages: QualityProfileLanguagesTable;
	quality_group_members: QualityGroupMembersTable;
	quality_profile_qualities: QualityProfileQualitiesTable;
	quality_profile_custom_formats: QualityProfileCustomFormatsTable;
	condition_patterns: ConditionPatternsTable;
	condition_languages: ConditionLanguagesTable;
	condition_indexer_flags: ConditionIndexerFlagsTable;
	condition_sources: ConditionSourcesTable;
	condition_resolutions: ConditionResolutionsTable;
	condition_quality_modifiers: ConditionQualityModifiersTable;
	condition_sizes: ConditionSizesTable;
	condition_release_types: ConditionReleaseTypesTable;
	condition_years: ConditionYearsTable;
	delay_profiles: DelayProfilesTable;
	delay_profile_tags: DelayProfileTagsTable;
	quality_api_mappings: QualityApiMappingsTable;
	radarr_quality_definitions: RadarrQualityDefinitionsTable;
	sonarr_quality_definitions: SonarrQualityDefinitionsTable;
	radarr_naming: RadarrNamingTable;
	sonarr_naming: SonarrNamingTable;
	radarr_media_settings: RadarrMediaSettingsTable;
	sonarr_media_settings: SonarrMediaSettingsTable;
}
