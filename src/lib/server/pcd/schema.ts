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
}
