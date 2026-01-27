/**
 * PCD Display Types
 *
 * Types for query results that include JOINed data.
 * These extend the generated Row types with related entities.
 */

import type { RegularExpressionsRow } from './types.ts';

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
