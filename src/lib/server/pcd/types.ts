/**
 * Type definitions for PCD (Profilarr Compliant Database) entities
 * Based on PCD Schema v1
 */

// ============================================================================
// CORE ENTITY TYPES
// ============================================================================

export interface Tag {
	name: string;
	created_at: string;
}

export interface Language {
	id: number;
	name: string;
	created_at: string;
	updated_at: string;
}

export interface RegularExpression {
	id: number;
	name: string;
	pattern: string;
	regex101_id: string | null;
	description: string | null;
	created_at: string;
	updated_at: string;
	tags?: Tag[];
}

export interface Quality {
	id: number;
	name: string;
	created_at: string;
	updated_at: string;
}

export interface CustomFormat {
	id: number;
	name: string;
	description: string | null;
	created_at: string;
	updated_at: string;
	tags?: Tag[];
	conditions?: CustomFormatCondition[];
}

// ============================================================================
// QUALITY PROFILE TYPES
// ============================================================================

export interface QualityProfile {
	id: number;
	name: string;
	description: string | null;
	upgrades_allowed: number; // 0 or 1 (boolean)
	minimum_custom_format_score: number;
	upgrade_until_score: number;
	upgrade_score_increment: number;
	created_at: string;
	updated_at: string;
	tags?: Tag[];
	languages?: QualityProfileLanguage[];
	qualities?: QualityProfileQuality[];
	customFormats?: QualityProfileCustomFormat[];
}

export interface QualityGroup {
	quality_profile_name: string;
	name: string;
	created_at: string;
	updated_at: string;
	members?: Quality[]; // Qualities in this group
}

export interface QualityProfileLanguage {
	language: Language;
	type: 'must' | 'only' | 'not' | 'simple';
}

export interface QualityProfileQuality {
	quality_profile_name: string;
	quality_name: string | null;
	quality_group_name: string | null;
	position: number;
	enabled: number; // 0 or 1 (boolean)
	upgrade_until: number; // 0 or 1 (boolean)
	// Populated fields
	quality?: Quality;
	qualityGroup?: QualityGroup;
}

export interface QualityProfileCustomFormat {
	customFormat: CustomFormat;
	arr_type: PcdArrTarget;
	score: number;
}

// ============================================================================
// CUSTOM FORMAT CONDITION TYPES
// ============================================================================

/**
 * PCD arr targeting - includes 'all' to indicate a condition/score applies to all arr types
 * This is different from $arr/types.ts ArrType which represents actual arr application types
 */
export type PcdArrTarget = 'radarr' | 'sonarr' | 'all';

export type ConditionType =
	| 'release_title'
	| 'release_group'
	| 'edition'
	| 'language'
	| 'indexer_flag'
	| 'source'
	| 'resolution'
	| 'quality_modifier'
	| 'size'
	| 'release_type'
	| 'year';

export interface CustomFormatCondition {
	custom_format_name: string;
	name: string;
	type: ConditionType;
	arr_type: PcdArrTarget;
	negate: number; // 0 or 1 (boolean)
	required: number; // 0 or 1 (boolean)
	created_at: string;
	updated_at: string;
	// Type-specific data (only one will be populated based on type)
	patternData?: ConditionPattern;
	languageData?: ConditionLanguage;
	indexerFlagData?: ConditionIndexerFlag;
	sourceData?: ConditionSource;
	resolutionData?: ConditionResolution;
	qualityModifierData?: ConditionQualityModifier;
	sizeData?: ConditionSize;
	releaseTypeData?: ConditionReleaseType;
	yearData?: ConditionYear;
}

// Condition type-specific data structures

export interface ConditionPattern {
	regular_expression_name: string;
	regularExpression?: RegularExpression;
}

export interface ConditionLanguage {
	language_name: string;
	except_language: number; // 0 or 1 (boolean)
	language?: Language;
}

export interface ConditionIndexerFlag {
	flag: string;
}

export interface ConditionSource {
	source: string;
}

export interface ConditionResolution {
	resolution: string;
}

export interface ConditionQualityModifier {
	quality_modifier: string;
}

export interface ConditionSize {
	min_bytes: number | null;
	max_bytes: number | null;
}

export interface ConditionReleaseType {
	release_type: string;
}

export interface ConditionYear {
	min_year: number | null;
	max_year: number | null;
}

// ============================================================================
// RAW DATABASE ROW TYPES (for direct SQL queries)
// ============================================================================

export interface QualityProfileRow {
	id: number;
	name: string;
	description: string | null;
	upgrades_allowed: number;
	minimum_custom_format_score: number;
	upgrade_until_score: number;
	upgrade_score_increment: number;
	created_at: string;
	updated_at: string;
}

export interface CustomFormatRow {
	id: number;
	name: string;
	description: string | null;
	created_at: string;
	updated_at: string;
}

export interface CustomFormatConditionRow {
	custom_format_name: string;
	name: string;
	type: string;
	arr_type: string;
	negate: number;
	required: number;
	created_at: string;
	updated_at: string;
}

export interface QualityProfileCustomFormatRow {
	quality_profile_name: string;
	custom_format_name: string;
	arr_type: string;
	score: number;
}

export interface QualityProfileLanguageRow {
	quality_profile_name: string;
	language_name: string;
	type: string;
}

export interface QualityProfileQualityRow {
	quality_profile_name: string;
	quality_name: string | null;
	quality_group_name: string | null;
	position: number;
	enabled: number;
	upgrade_until: number;
}

export interface QualityGroupRow {
	quality_profile_name: string;
	name: string;
	created_at: string;
	updated_at: string;
}

export interface QualityGroupMemberRow {
	quality_profile_name: string;
	quality_group_name: string;
	quality_name: string;
}

// ============================================================================
// QUALITY PROFILE SCORING TYPES
// ============================================================================

export interface CustomFormatScoring {
	name: string; // custom format name
	tags: string[]; // tag names for filtering
	scores: Record<string, number | null>; // arr_type -> score mapping
}

export interface QualityProfileScoring {
	databaseId: number; // PCD database ID (for linking)
	arrTypes: string[]; // Display arr types: ['radarr', 'sonarr']. Note: 'all' scores are applied to each type
	customFormats: CustomFormatScoring[]; // All custom formats with their scores
	minimum_custom_format_score: number; // Minimum score to accept
	upgrade_until_score: number; // Stop upgrading when reached
	upgrade_score_increment: number; // Minimum score improvement needed
}

