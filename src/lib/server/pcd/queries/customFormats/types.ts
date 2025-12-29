/**
 * Custom Format query-specific types
 */

import type { Tag } from '../../types.ts';

/** Condition reference for display */
export interface ConditionRef {
	id: number;
	name: string;
	required: boolean;
	negate: boolean;
}

/** Custom format data for table/card views */
export interface CustomFormatTableRow {
	id: number;
	name: string;
	description: string | null;
	tags: Tag[];
	conditions: ConditionRef[];
}
