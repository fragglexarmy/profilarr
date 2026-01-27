/**
 * PCD Display Types
 *
 * Types for query results that include JOINed data or need semantic naming.
 * Simple aliases to generated Row types are provided for cleaner API.
 */

import type { RegularExpressionsRow } from './types.ts';
import type { DelayProfilesRow } from './types.ts';

// ============================================================================
// COMMON
// ============================================================================

/** Tag with metadata */
export interface Tag {
	name: string;
	created_at: string;
}

// ============================================================================
// REGULAR EXPRESSIONS
// ============================================================================

/** Regular expression with tags (from JOIN) */
export type RegularExpressionWithTags = RegularExpressionsRow & {
	tags: Tag[];
};

// ============================================================================
// DELAY PROFILES
// ============================================================================
// No JOINs needed - the generated Row type is already semantic (booleans, unions).
// Re-exported here for consistent import pattern across all entities.

export type { DelayProfilesRow } from './types.ts';

/** Preferred protocol options - extracted for use in mutations */
export type PreferredProtocol = DelayProfilesRow['preferred_protocol'];

// ============================================================================
// MEDIA MANAGEMENT
// ============================================================================

import type { ArrType } from './types.ts';

// Naming
export type { RadarrNamingRow, SonarrNamingRow } from './types.ts';

export interface NamingListItem {
	name: string;
	arr_type: Exclude<ArrType, 'all'>;
	rename: boolean;
	updated_at: string;
}

// Media Settings
export type { RadarrMediaSettingsRow, SonarrMediaSettingsRow } from './types.ts';

export interface MediaSettingsListItem {
	name: string;
	arr_type: Exclude<ArrType, 'all'>;
	propers_repacks: string;
	enable_media_info: boolean;
	updated_at: string;
}

// Quality Definitions
export type { RadarrQualityDefinitionsRow, SonarrQualityDefinitionsRow } from './types.ts';

export interface QualityDefinitionListItem {
	name: string;
	arr_type: Exclude<ArrType, 'all'>;
	quality_count: number;
	updated_at: string;
}

/** Single quality entry (Row without the config name) */
export interface QualityDefinitionEntry {
	quality_name: string;
	min_size: number;
	max_size: number;
	preferred_size: number;
}

/** Aggregate config with all its entries */
export interface QualityDefinitionsConfig {
	name: string;
	entries: QualityDefinitionEntry[];
}

// ============================================================================
// ENTITY TESTS
// ============================================================================

import type { TestEntitiesRow, TestReleasesRow } from './types.ts';

/** Test release with parsed arrays (JSON strings → string[]) */
export type TestRelease = Omit<
	TestReleasesRow,
	'entity_type' | 'entity_tmdb_id' | 'languages' | 'indexers' | 'flags' | 'created_at' | 'updated_at'
> & {
	languages: string[];
	indexers: string[];
	flags: string[];
};

/** Test entity with nested releases */
export type TestEntity = Omit<TestEntitiesRow, 'created_at' | 'updated_at'> & {
	releases: TestRelease[];
};

// ============================================================================
// CUSTOM FORMATS
// ============================================================================

import type {
	CustomFormatsRow,
	CustomFormatConditionsRow,
	CustomFormatTestsRow
} from './types.ts';

/** Condition reference for display (minimal info) */
export type ConditionRef = Pick<CustomFormatConditionsRow, 'name' | 'type' | 'required' | 'negate'>;

/** Condition item for list display */
export type ConditionListItem = ConditionRef;

/** Custom format basic info */
export type CustomFormatBasic = Omit<CustomFormatsRow, 'created_at' | 'updated_at'>;

/** Custom format test case */
export type CustomFormatTest = Omit<CustomFormatTestsRow, 'id' | 'created_at'>;

/** Custom format data for table/card views (with JOINed data) */
export type CustomFormatTableRow = Omit<CustomFormatsRow, 'include_in_rename' | 'created_at' | 'updated_at'> & {
	tags: Tag[];
	conditions: ConditionRef[];
	testCount: number;
};

/** Custom format general information (for general tab) */
export type CustomFormatGeneral = Omit<CustomFormatsRow, 'description' | 'created_at' | 'updated_at'> & {
	description: string; // non-nullable for form
	tags: Tag[];
};

/** Full condition data for evaluation and editing (assembled from multiple tables) */
export interface ConditionData {
	name: string;
	type: string;
	arrType: 'all' | 'radarr' | 'sonarr';
	negate: boolean;
	required: boolean;
	// Type-specific data (only one populated based on `type`)
	patterns?: { name: string; pattern: string }[];
	languages?: { name: string; except: boolean }[];
	sources?: string[];
	resolutions?: string[];
	qualityModifiers?: string[];
	releaseTypes?: string[];
	indexerFlags?: string[];
	size?: { minBytes: number | null; maxBytes: number | null };
	years?: { minYear: number | null; maxYear: number | null };
}

/** Single condition evaluation result */
export interface ConditionResult {
	conditionName: string;
	conditionType: string;
	matched: boolean;
	required: boolean;
	negate: boolean;
	/** Final result after applying negate */
	passes: boolean;
	/** What the condition expected */
	expected: string;
	/** What was actually found in the parsed title */
	actual: string;
}

/** Full evaluation result of all conditions */
export interface EvaluationResult {
	/** Whether the custom format matches overall */
	matches: boolean;
	/** Individual condition results */
	conditions: ConditionResult[];
}

/** Serializable parsed info for frontend display */
export interface ParsedInfo {
	source: string;
	resolution: string;
	modifier: string;
	languages: string[];
	releaseGroup: string | null;
	year: number;
	edition: string | null;
	releaseType: string | null;
}

/** Custom format with conditions for batch evaluation */
export interface CustomFormatWithConditions {
	name: string;
	conditions: ConditionData[];
}
