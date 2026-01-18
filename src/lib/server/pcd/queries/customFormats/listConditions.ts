/**
 * Custom format condition list query
 */

import type { PCDCache } from '../../cache.ts';

/** Condition item for list display */
export interface ConditionListItem {
	name: string;
	type: string;
	negate: boolean;
	required: boolean;
}

/**
 * Get all conditions for a custom format (basic info for list display)
 */
export async function listConditions(
	cache: PCDCache,
	formatName: string
): Promise<ConditionListItem[]> {
	const db = cache.kb;

	const conditions = await db
		.selectFrom('custom_format_conditions')
		.select(['name', 'type', 'negate', 'required'])
		.where('custom_format_name', '=', formatName)
		.orderBy('name')
		.execute();

	return conditions.map((c) => ({
		name: c.name,
		type: c.type,
		negate: c.negate === 1,
		required: c.required === 1
	}));
}
