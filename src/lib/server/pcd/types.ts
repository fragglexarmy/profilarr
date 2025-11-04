/**
 * Type definitions for PCD (Profilarr Compliant Database) entities
 * Based on PCD Schema v1
 */

// ============================================================================
// CORE ENTITY TYPES
// ============================================================================

export interface Tag {
	id: number;
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
	id: number;
	quality_profile_id: number;
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
	id: number;
	quality_profile_id: number;
	quality_id: number | null;
	quality_group_id: number | null;
	position: number;
	upgrade_until: number; // 0 or 1 (boolean)
	// Populated fields
	quality?: Quality;
	qualityGroup?: QualityGroup;
}

export interface QualityProfileCustomFormat {
	customFormat: CustomFormat;
	arr_type: 'radarr' | 'sonarr' | 'all';
	score: number;
}

// ============================================================================
// CUSTOM FORMAT CONDITION TYPES
// ============================================================================

export type ArrType = 'radarr' | 'sonarr' | 'all';

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
	id: number;
	custom_format_id: number;
	name: string;
	type: ConditionType;
	arr_type: ArrType;
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
	regular_expression_id: number;
	regularExpression?: RegularExpression;
}

export interface ConditionLanguage {
	language_id: number;
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
	id: number;
	custom_format_id: number;
	name: string;
	type: string;
	arr_type: string;
	negate: number;
	required: number;
	created_at: string;
	updated_at: string;
}

export interface QualityProfileCustomFormatRow {
	quality_profile_id: number;
	custom_format_id: number;
	arr_type: string;
	score: number;
}

export interface QualityProfileLanguageRow {
	quality_profile_id: number;
	language_id: number;
	type: string;
}

export interface QualityProfileQualityRow {
	id: number;
	quality_profile_id: number;
	quality_id: number | null;
	quality_group_id: number | null;
	position: number;
	upgrade_until: number;
}

export interface QualityGroupRow {
	id: number;
	quality_profile_id: number;
	name: string;
	created_at: string;
	updated_at: string;
}

export interface QualityGroupMemberRow {
	quality_group_id: number;
	quality_id: number;
}
