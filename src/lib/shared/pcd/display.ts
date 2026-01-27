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
