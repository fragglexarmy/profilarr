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
