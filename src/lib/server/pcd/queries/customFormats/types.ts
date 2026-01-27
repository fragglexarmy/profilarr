/**
 * Custom Format query-specific types
 */

import type { Tag } from '$shared/pcd/display.ts';

/** Condition reference for display */
export interface ConditionRef {
	name: string;
	type: string;
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
	testCount: number;
}

/** Custom format basic info */
export interface CustomFormatBasic {
	id: number;
	name: string;
	description: string | null;
	include_in_rename: boolean;
}

/** Custom format general information (for general tab) */
export interface CustomFormatGeneral {
	id: number;
	name: string;
	description: string;
	include_in_rename: boolean;
	tags: Tag[];
}

/** Custom format test case */
export interface CustomFormatTest {
	custom_format_name: string;
	title: string;
	type: string;
	should_match: boolean;
	description: string | null;
}
